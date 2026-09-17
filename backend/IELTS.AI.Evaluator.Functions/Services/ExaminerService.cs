using System.Text;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

public interface IExaminerService
{
    /// <summary>Same token contract as the evaluation services: it aborts before Gemini is paid,
    /// never after — the usage row must land even if the caller has gone.</summary>
    Task<ExaminerTurnResult> NextTurnAsync(Guid userId, ExaminerTurnRequest request, CancellationToken ct = default);
}

/// <summary>Live examiner-turn endpoint: not quota-gated (only the final evaluation endpoint is),
/// but hard-capped on examiner turn count so a runaway conversation can't rack up Gemini calls.
/// Because no quota gates it, every call records its Gemini usage — that log is what makes this
/// path visible on the admin user list.</summary>
public class ExaminerService : IExaminerService
{
    private const int MaxExaminerTurns = 8;
    private const int MaxExaminerTurnsPart2 = 3;
    private static readonly string[] ValidParts = { "Part1", "Part2", "Part3" };

    private readonly IGeminiStructuredClient _gemini;
    private readonly EvaluatorDbContext _db;

    public ExaminerService(IGeminiStructuredClient gemini, EvaluatorDbContext db)
    {
        _gemini = gemini;
        _db = db;
    }

    public async Task<ExaminerTurnResult> NextTurnAsync(Guid userId, ExaminerTurnRequest request,
        CancellationToken ct = default)
    {
        if (request.SpeakingPromptId == Guid.Empty || string.IsNullOrWhiteSpace(request.Part) || request.Turns is null)
            throw new ValidationException("Speaking prompt, part, and turns are required.");
        if (!ValidParts.Contains(request.Part))
            throw new ValidationException("Part must be one of Part1, Part2, or Part3.");

        SpeakingService.ValidateConversationCap(request.Turns);

        var prompt = await _db.SpeakingPrompts.FirstOrDefaultAsync(p => p.SpeakingPromptId == request.SpeakingPromptId, ct)
            ?? throw new NotFoundException("Speaking prompt not found.");

        var examinerTurnCount = request.Turns.Count(t => t.Role.Equals("examiner", StringComparison.OrdinalIgnoreCase));
        var cap = request.Part.Equals("Part2", StringComparison.OrdinalIgnoreCase) ? MaxExaminerTurnsPart2 : MaxExaminerTurns;
        if (examinerTurnCount >= cap)
            return new ExaminerTurnResult("", true);

        var userContent = BuildUserContent(prompt, request.Part, request.Turns);
        var result = await _gemini.GenerateAsync<ExaminerTurnResult>(
            ExaminerPrompts.SystemPrompt, userContent, ExaminerPrompts.GeminiSchema, ct,
            thinkingBudget: 0); // a follow-up question needs no reasoning; thinking only adds turn latency

        // The turn itself is never persisted, so this row is the only record that the call was
        // paid for. Written after the call so a failed one is not billed to the user.
        _db.ExaminerTurnUsages.Add(new ExaminerTurnUsage
        {
            UserId = userId,
            PromptTokens = result.PromptTokens,
            CompletionTokens = result.CompletionTokens,
        });
        // Deliberately not ct: this row is the *only* record that the call was paid for, so dropping
        // it on a cancellation would make the spend invisible on the admin list.
        await _db.SaveChangesAsync(CancellationToken.None);

        return result.Value;
    }

    private static string BuildUserContent(SpeakingPrompt prompt, string part, List<SpeakingTurn> turns)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Part: {part}");
        sb.AppendLine($"Topic: {prompt.Topic}");
        sb.AppendLine($"Question: {prompt.QuestionText}");
        if (!string.IsNullOrWhiteSpace(prompt.Cuepoints))
            sb.AppendLine($"Cue points: {prompt.Cuepoints}");
        sb.AppendLine("Conversation so far:");
        foreach (var turn in turns)
        {
            var speaker = turn.Role.Equals("examiner", StringComparison.OrdinalIgnoreCase) ? "Examiner" : "Candidate";
            sb.AppendLine($"{speaker}: {turn.Text}");
        }
        return sb.ToString();
    }
}
