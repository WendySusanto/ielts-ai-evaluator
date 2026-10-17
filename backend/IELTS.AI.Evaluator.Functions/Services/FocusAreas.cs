using IELTS.AI.Evaluator.Functions.DTOs;

namespace IELTS.AI.Evaluator.Functions.Services;

public record FocusCriterionDto(string Name, decimal Band, string? Tip);
public record FocusMistakeDto(string Category, int Count, string Original, string Corrected);
public record DashboardFocusDto(FocusCriterionDto? Writing, FocusCriterionDto? Speaking, List<FocusMistakeDto> Mistakes);

/// <summary>What a learner should practise next, read from feedback already stored: the criterion
/// pulling each skill's band down most, and the mistakes that keep coming back. No model call. The
/// tips are the advice Gemini wrote when it marked the work.</summary>
public static class FocusAreas
{
    /// <summary>Evaluations per skill looked at: recent enough to describe the learner now, so a
    /// mistake they have since fixed drops out.</summary>
    public const int Window = 10;
    private const int MinMistakeCount = 2;
    private const int TopMistakes = 3;

    /// <summary>Task 1 is marked on Task Achievement and Task 2 on Task Response. Both ask whether
    /// the task was answered, so they are averaged as one.</summary>
    public const string TaskCriterion = "TaskAchievementResponse";

    // Official order: a tie goes to the one listed first.
    private static readonly string[] WritingOrder =
        [TaskCriterion, "CoherenceCohesion", "LexicalResource", "GrammaticalRangeAccuracy"];
    private static readonly string[] SpeakingOrder =
        ["FluencyCoherence", "LexicalResource", "GrammaticalRangeAccuracy", "Pronunciation"];

    public record Scored(string Name, decimal Band, string? Tip);
    public record Mistake(string Category, string Original, string Corrected);
    public record Evaluation(DateTime CreatedAt, List<Scored> Criteria, List<Mistake> Mistakes);

    // System.Text.Json leaves any key an older schema never wrote as null, whatever the record
    // declares, hence the ?? on every list read below.
    public static Evaluation FromWriting(DateTime createdAt, WritingFeedback feedback) => new(
        createdAt,
        (feedback.Criteria ?? [])
            .Select(c => new Scored(
                c.Name is "TaskAchievement" or "TaskResponse" ? TaskCriterion : c.Name,
                c.Band,
                c.Improvements?.FirstOrDefault()))
            .ToList(),
        // Essays marked before errors had a category can't be counted, so they add no mistakes.
        (feedback.Errors ?? [])
            .Where(e => e.Category is not null)
            .Select(e => new Mistake(e.Category!, e.Quote, e.Correction))
            .ToList());

    public static Evaluation FromSpeaking(DateTime createdAt, SpeakingFeedback feedback, PronunciationResult? pronunciation)
    {
        var criteria = (feedback.Criteria ?? [])
            // nextBand is the sharper advice; sessions before schema v2 only have improvements.
            .Select(c => new Scored(c.Name, c.Band, c.NextBand?.HowTo ?? c.Improvements?.FirstOrDefault()))
            .ToList();
        // Pronunciation is Azure's band, not Gemini's, and exists only when audio was assessed.
        if (pronunciation is not null)
            criteria.Add(new Scored("Pronunciation", pronunciation.Band, feedback.PronunciationNotes?.FirstOrDefault()?.Tip));
        return new(createdAt, criteria,
            (feedback.Errors ?? []).Select(e => new Mistake(e.Category, e.Original, e.Corrected)).ToList());
    }

    /// <summary>Each list newest first, at most <see cref="Window"/> long.</summary>
    public static DashboardFocusDto Compute(IReadOnlyList<Evaluation> writing, IReadOnlyList<Evaluation> speaking)
    {
        var mistakes = writing.Concat(speaking)
            .OrderByDescending(e => e.CreatedAt)
            .SelectMany(e => e.Mistakes)
            .Where(m => m.Category != "other")
            .GroupBy(m => m.Category) // a group keeps source order, so First() is the newest
            .Where(g => g.Count() >= MinMistakeCount)
            .OrderByDescending(g => g.Count()) // stable: a tie goes to the more recently seen
            .Take(TopMistakes)
            .Select(g => new FocusMistakeDto(g.Key, g.Count(), g.First().Original, g.First().Corrected))
            .ToList();

        return new DashboardFocusDto(Weakest(writing, WritingOrder), Weakest(speaking, SpeakingOrder), mistakes);
    }

    private static FocusCriterionDto? Weakest(IReadOnlyList<Evaluation> evaluations, string[] order)
    {
        var scored = evaluations.SelectMany(e => e.Criteria).ToList(); // newest first
        if (scored.Count == 0) return null;

        var weakest = scored
            .GroupBy(s => s.Name)
            .Select(g => (Name: g.Key, Band: g.Average(s => s.Band)))
            .OrderBy(c => c.Band)
            .ThenBy(c => Rank(order, c.Name))
            .First();
        var tip = scored.FirstOrDefault(s => s.Name == weakest.Name && !string.IsNullOrWhiteSpace(s.Tip))?.Tip;
        return new FocusCriterionDto(weakest.Name, Math.Round(weakest.Band, 1), tip);
    }

    private static int Rank(string[] order, string name)
    {
        var i = Array.IndexOf(order, name);
        return i < 0 ? int.MaxValue : i;
    }
}
