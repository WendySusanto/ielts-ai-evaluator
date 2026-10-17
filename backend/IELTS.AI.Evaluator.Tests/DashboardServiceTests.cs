using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Tests;

public class DashboardServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (DashboardService svc, EvaluatorDbContext db, Guid userId) Setup()
    {
        var db = NewDb();
        var userId = Guid.NewGuid();
        db.Users.Add(new User { UserId = userId, FirebaseUid = "uid", Email = "t@t.t", FullName = "T" });
        db.SaveChanges();
        return (new DashboardService(db), db, userId);
    }

    private static void AddWriting(EvaluatorDbContext db, Guid userId, decimal band, DateTime createdAt, string feedback = "{}")
    {
        var prompt = new WritingPrompt
        {
            WritingPromptId = Guid.NewGuid(),
            Topic = "Tech",
            Description = "D",
            Preview = "P",
            QuestionType = "Opinion",
            QuestionText = "Q",
            TaskType = "Task2",
        };
        db.WritingPrompts.Add(prompt);
        db.WritingEvaluations.Add(new WritingEvaluation
        {
            WritingEvaluationId = Guid.NewGuid(),
            UserId = userId,
            WritingPromptId = prompt.WritingPromptId,
            EssayText = "a",
            WordCount = 1,
            OverallBand = band,
            Feedback = feedback,
            CreatedAt = createdAt,
        });
        db.SaveChanges();
    }

    private static void AddSpeaking(EvaluatorDbContext db, Guid userId, decimal band, DateTime createdAt,
        string feedback = "{}", string? pronunciation = null)
    {
        var prompt = new SpeakingPrompt
        {
            SpeakingPromptId = Guid.NewGuid(),
            Topic = "Hometown",
            Description = "D",
            Preview = "P",
            QuestionText = "Q",
        };
        db.SpeakingPrompts.Add(prompt);
        db.SpeakingSessions.Add(new SpeakingSession
        {
            SpeakingSessionId = Guid.NewGuid(),
            UserId = userId,
            SpeakingPromptId = prompt.SpeakingPromptId,
            Part = "Part2",
            Turns = "[]",
            OverallBand = band,
            Feedback = feedback,
            Pronunciation = pronunciation,
            CreatedAt = createdAt,
        });
        db.SaveChanges();
    }

    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);
    private static readonly DateTime T0 = new(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);

    /// <summary>Writing feedback, bands in official order. Each criterion's one improvement reads
    /// "{criterion} {tag}", so a test can tell which essay a tip came from.</summary>
    private static string Writing(decimal task, decimal cc, decimal lr, decimal gra, string tag = "",
        string taskKey = "TaskResponse", List<WritingError>? errors = null) =>
        JsonSerializer.Serialize(new WritingFeedback(0, "", [
            new WritingCriterion(taskKey, task, "", [], [$"{taskKey} {tag}"]),
            new WritingCriterion("CoherenceCohesion", cc, "", [], [$"CoherenceCohesion {tag}"]),
            new WritingCriterion("LexicalResource", lr, "", [], [$"LexicalResource {tag}"]),
            new WritingCriterion("GrammaticalRangeAccuracy", gra, "", [], [$"GrammaticalRangeAccuracy {tag}"]),
        ], errors ?? [], [], ""), Web);

    /// <summary>Speaking feedback. nextBand.howTo reads "{criterion} next" (absent when v1, as on
    /// sessions before schema v2); the one improvement reads "{criterion} improve".</summary>
    private static string Speaking(decimal fc, decimal lr, decimal gra, bool v1 = false,
        List<SpeakingError>? errors = null, List<SpeakingPronunciationNote>? notes = null)
    {
        SpeakingCriterion C(string name, decimal band) => new(name, band, "", [], [$"{name} improve"],
            NextBand: v1 ? null : new SpeakingNextBand(band + 1, "", $"{name} next"));
        return JsonSerializer.Serialize(new SpeakingFeedback(0, "",
            [C("FluencyCoherence", fc), C("LexicalResource", lr), C("GrammaticalRangeAccuracy", gra)],
            Errors: errors, PronunciationNotes: notes), Web);
    }

    private static string Pronunciation(decimal band) =>
        JsonSerializer.Serialize(new PronunciationResult(band, 0, 0, 0, 0, 0, []), Web);

    [Fact]
    public async Task Focus_PicksWeakestCriterionPerSkill_WithTipFromLatestEvaluation()
    {
        var (svc, db, userId) = Setup();
        AddWriting(db, userId, 6m, T0, Writing(6.5m, 6.5m, 5, 6.5m, tag: "old"));
        AddWriting(db, userId, 6m, T0.AddDays(1), Writing(6.5m, 6.5m, 6, 6.5m, tag: "new"));
        AddSpeaking(db, userId, 6m, T0, Speaking(5, 6, 6));

        var focus = (await svc.GetDashboardAsync(userId)).Focus;

        Assert.Equal(new FocusCriterionDto("LexicalResource", 5.5m, "LexicalResource new"), focus.Writing);
        Assert.Equal(new FocusCriterionDto("FluencyCoherence", 5m, "FluencyCoherence next"), focus.Speaking);
    }

    [Fact]
    public async Task Focus_AveragesTaskAchievementAndTaskResponseAsOneCriterion()
    {
        var (svc, db, userId) = Setup();
        AddWriting(db, userId, 6m, T0, Writing(5, 7, 7, 7, tag: "t1", taskKey: "TaskAchievement"));
        AddWriting(db, userId, 6m, T0.AddDays(1), Writing(6, 7, 7, 7, tag: "t2", taskKey: "TaskResponse"));

        var writing = (await svc.GetDashboardAsync(userId)).Focus.Writing;

        Assert.Equal(new FocusCriterionDto(FocusAreas.TaskCriterion, 5.5m, "TaskResponse t2"), writing);
    }

    [Fact]
    public async Task Focus_TieGoesToOfficialCriterionOrder_NotStoredOrder()
    {
        var (svc, db, userId) = Setup();
        AddWriting(db, userId, 6m, T0, JsonSerializer.Serialize(new WritingFeedback(0, "", [
            new WritingCriterion("GrammaticalRangeAccuracy", 6, "", [], []),
            new WritingCriterion("LexicalResource", 6, "", [], []),
            new WritingCriterion("CoherenceCohesion", 6, "", [], []),
            new WritingCriterion("TaskResponse", 6, "", [], []),
        ], [], [], ""), Web));

        var writing = (await svc.GetDashboardAsync(userId)).Focus.Writing!;

        Assert.Equal(FocusAreas.TaskCriterion, writing.Name);
        Assert.Null(writing.Tip); // no improvements were written
    }

    [Fact]
    public async Task Focus_CountsAzurePronunciation_WithTipFromPronunciationNotes()
    {
        var (svc, db, userId) = Setup();
        AddSpeaking(db, userId, 6m, T0,
            Speaking(6, 6, 6, notes: [new SpeakingPronunciationNote("develop", "devlop", "Stress the second syllable.")]),
            pronunciation: Pronunciation(5m));

        var speaking = (await svc.GetDashboardAsync(userId)).Focus.Speaking;

        Assert.Equal(new FocusCriterionDto("Pronunciation", 5m, "Stress the second syllable."), speaking);
    }

    [Fact]
    public async Task Focus_SpeakingTip_FallsBackToImprovements_OnSessionsWithoutNextBand()
    {
        var (svc, db, userId) = Setup();
        AddSpeaking(db, userId, 6m, T0, Speaking(6, 5, 6, v1: true));

        var speaking = (await svc.GetDashboardAsync(userId)).Focus.Speaking;

        Assert.Equal(new FocusCriterionDto("LexicalResource", 5m, "LexicalResource improve"), speaking);
    }

    [Fact]
    public async Task Focus_LooksOnlyAtTheLastTenEvaluationsPerSkill()
    {
        var (svc, db, userId) = Setup();
        AddWriting(db, userId, 4m, T0, Writing(7, 7, 7, 1)); // 11th newest: outside the window
        for (var i = 1; i <= 10; i++)
            AddWriting(db, userId, 6m, T0.AddDays(i), Writing(7, 7, 7, 5));

        var writing = (await svc.GetDashboardAsync(userId)).Focus.Writing!;

        Assert.Equal("GrammaticalRangeAccuracy", writing.Name);
        Assert.Equal(5m, writing.Band); // 4.6 if the oldest essay's 1 were counted
    }

    [Fact]
    public async Task Focus_RecurringMistakes_TopThreeSeenTwice_NewestExample_AcrossBothSkills()
    {
        var (svc, db, userId) = Setup();
        // Marked before writing errors had a category: never counted (3 would otherwise top the list).
        AddWriting(db, userId, 6m, T0, Writing(6, 6, 6, 6, errors: [
            new WritingError("a informations", "information", "r"),
            new WritingError("a advices", "advice", "r"),
            new WritingError("a furnitures", "furniture", "r"),
        ]));
        AddWriting(db, userId, 6m, T0.AddDays(1), Writing(6, 6, 6, 6, errors: [
            new WritingError("a information", "information", "r", "article"),
        ]));
        AddSpeaking(db, userId, 6m, T0.AddDays(2), Speaking(6, 6, 6, errors: [
            new SpeakingError("the nature", "nature", "article", ""),
            new SpeakingError("people is", "people are", "agreement", ""),
            new SpeakingError("he go", "he goes", "agreement", ""),
            new SpeakingError("I go yesterday", "I went yesterday", "tense", ""),
            new SpeakingError("I eat yesterday", "I ate yesterday", "tense", ""),
            new SpeakingError("two car", "two cars", "plural", ""),
            new SpeakingError("three book", "three books", "plural", ""),
            new SpeakingError("um", "", "other", ""),
            new SpeakingError("uh", "", "other", ""),
            new SpeakingError("er", "", "other", ""),
        ]));

        var mistakes = (await svc.GetDashboardAsync(userId)).Focus.Mistakes;

        Assert.Equal(new[]
        {
            new FocusMistakeDto("article", 2, "the nature", "nature"), // the speaking one is newer
            new FocusMistakeDto("agreement", 2, "people is", "people are"),
            new FocusMistakeDto("tense", 2, "I go yesterday", "I went yesterday"),
        }, mistakes);
    }

    [Fact]
    public async Task Focus_MistakeSeenOnce_IsNotRecurring()
    {
        var (svc, db, userId) = Setup();
        AddSpeaking(db, userId, 6m, T0, Speaking(6, 6, 6, errors: [new SpeakingError("in Monday", "on Monday", "preposition", "")]));

        Assert.Empty((await svc.GetDashboardAsync(userId)).Focus.Mistakes);
    }

    [Fact]
    public async Task Focus_SkipsFeedbackThatDoesNotParse()
    {
        var (svc, db, userId) = Setup();
        AddWriting(db, userId, 6m, T0, "[]");
        AddWriting(db, userId, 6m, T0.AddDays(1), Writing(6, 6, 5, 6));

        var dto = await svc.GetDashboardAsync(userId);

        Assert.Equal("LexicalResource", dto.Focus.Writing!.Name);
        Assert.Equal(2, dto.WritingCount);
    }

    [Fact]
    public async Task Dashboard_MergesWritingAndSpeaking_SortedDesc_OnlyOwnRows()
    {
        var (svc, db, userId) = Setup();
        var t0 = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);
        AddWriting(db, userId, 6.0m, t0);
        AddSpeaking(db, userId, 7.0m, t0.AddDays(1));
        AddWriting(db, userId, 8.0m, t0.AddDays(2));
        AddSpeaking(db, Guid.NewGuid(), 9.0m, t0.AddDays(3)); // other user — must not leak in

        var dto = await svc.GetDashboardAsync(userId);

        Assert.Equal(2, dto.WritingCount);
        Assert.Equal(1, dto.SpeakingCount);
        Assert.Equal(new[] { "writing", "speaking", "writing" }, dto.RecentItems.Select(i => i.Type));
        Assert.Equal(new[] { 8.0m, 7.0m, 6.0m }, dto.RecentItems.Select(i => i.OverallBand));
    }

    [Fact]
    public async Task Dashboard_EmptyState_ReturnsZeroCountsAndEmptyLists()
    {
        var (svc, _, userId) = Setup();

        var dto = await svc.GetDashboardAsync(userId);

        Assert.Equal(0, dto.WritingCount);
        Assert.Equal(0, dto.SpeakingCount);
        Assert.Null(dto.AverageBand);
        Assert.Empty(dto.BandTrend);
        Assert.Empty(dto.RecentItems);
        Assert.Null(dto.Focus.Writing);
        Assert.Null(dto.Focus.Speaking);
        Assert.Empty(dto.Focus.Mistakes);
        Assert.Equal(0, dto.WordsDue);
    }

    [Fact]
    public async Task Dashboard_WordsDue_CountsOwnUnmasteredWordsWhoseReviewHasComeRound()
    {
        var (svc, db, userId) = Setup();
        var now = DateTime.UtcNow;
        NotebookEntry Word(Guid owner, bool mastered, DateTime dueAt) => new()
        {
            NotebookEntryId = Guid.NewGuid(),
            UserId = owner,
            Word = Guid.NewGuid().ToString(),
            Source = "Manual",
            Mastered = mastered,
            DueAt = dueAt,
        };
        db.NotebookEntries.AddRange(
            Word(userId, false, now.AddHours(-1)),          // due
            Word(userId, false, now.AddMinutes(-1)),        // due
            Word(userId, false, now.AddDays(2)),            // scheduled later
            Word(userId, true, now.AddHours(-1)),           // mastered
            Word(Guid.NewGuid(), false, now.AddHours(-1))); // someone else's
        db.SaveChanges();

        Assert.Equal(2, (await svc.GetDashboardAsync(userId)).WordsDue);
    }

    [Fact]
    public async Task Dashboard_AverageBand_RoundsToOneDecimal_AndTrendIsAscending()
    {
        var (svc, db, userId) = Setup();
        var t0 = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);
        AddWriting(db, userId, 6.5m, t0);
        AddSpeaking(db, userId, 7.0m, t0.AddDays(1));
        AddWriting(db, userId, 6.0m, t0.AddDays(2));

        var dto = await svc.GetDashboardAsync(userId);

        // (6.5 + 7.0 + 6.0) / 3 = 6.5
        Assert.Equal(6.5m, dto.AverageBand);
        Assert.Equal(new[] { 6.5m, 7.0m, 6.0m }, dto.BandTrend.Select(p => p.OverallBand)); // ascending by CreatedAt
        Assert.Equal(new[] { "writing", "speaking", "writing" }, dto.BandTrend.Select(p => p.Type));
    }

    [Fact]
    public async Task GetRecent_RespectsTake_AcrossBothTypes()
    {
        var (svc, db, userId) = Setup();
        var t0 = new DateTime(2026, 7, 1, 12, 0, 0, DateTimeKind.Utc);
        for (var i = 0; i < 3; i++) AddWriting(db, userId, 6.0m, t0.AddHours(i));
        for (var i = 0; i < 3; i++) AddSpeaking(db, userId, 7.0m, t0.AddHours(10 + i));

        var items = await svc.GetRecentAsync(userId, 4);

        Assert.Equal(4, items.Count);
        // newest first: the 3 speaking sessions, then the newest writing evaluation
        Assert.Equal(new[] { "speaking", "speaking", "speaking", "writing" }, items.Select(i => i.Type));
        Assert.True(items.Zip(items.Skip(1)).All(p => p.First.CreatedAt >= p.Second.CreatedAt));
    }
}
