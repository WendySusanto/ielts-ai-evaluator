using System.Text;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services;

public interface IExaminerService
{
    /// <summary>Same token contract as the evaluation services: it aborts before Gemini is paid,
    /// never after — the usage row must land even if the caller has gone.</summary>
    Task<ExaminerTurnResult> NextTurnAsync(Guid userId, ExaminerTurnRequest request, CancellationToken ct = default);
}

/// <summary>Live examiner turn: no quota (only the final evaluation has one) but a hard turn cap, and
/// every call logs its Gemini usage so the spend shows on the admin list.</summary>
public class ExaminerService : IExaminerService
{
    private const int MaxExaminerTurns = 8;
    private const int MaxExaminerTurnsPart2 = 3;
    private static readonly string[] ValidParts = { "Part1", "Part2", "Part3" };

    private readonly IGeminiStructuredClient _gemini;
    private readonly EvaluatorDbContext _db;
    private readonly IConfiguration _config;

    public ExaminerService(IGeminiStructuredClient gemini, EvaluatorDbContext db, IConfiguration config)
    {
        _gemini = gemini;
        _db = db;
        _config = config;
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
        // The budget depends on the model (flash-lite 400s on 0, 3.8-flash wants 0). Unset: 0 on the default
        // endpoint, omitted on a custom one — so a half-configured env runs slower instead of failing.
        var examinerEndpoint = _config["GeminiExaminerApiEndpoint"];
        int? thinkingBudget = int.TryParse(_config["GeminiExaminerThinkingBudget"], out var configured)
            ? configured
            : string.IsNullOrWhiteSpace(examinerEndpoint) ? 0 : null;
        var result = await _gemini.GenerateAsync<ExaminerTurnResult>(
            ExaminerPrompts.SystemPrompt, userContent, ExaminerPrompts.GeminiSchema, ct,
            thinkingBudget: thinkingBudget,
            // Null until an environment opts in, which leaves the client on GeminiApiEndpoint — so
            // switching the examiner to a cheaper, lower-latency model is a config edit, not a deploy.
            endpoint: examinerEndpoint);

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
        {
            // Cuepoints is Part 2's cue card bullets or Part 1/3's question list; labelling them apart lets
            // the model ask Part 1/3 questions one at a time.
            sb.AppendLine(part.Equals("Part2", StringComparison.OrdinalIgnoreCase)
                ? $"Cue points: {prompt.Cuepoints}"
                : $"Scripted questions (one per line, ask in this order):\n{prompt.Cuepoints}");
        }
        sb.AppendLine("Conversation so far:");
        foreach (var turn in turns)
        {
            var speaker = turn.Role.Equals("examiner", StringComparison.OrdinalIgnoreCase) ? "Examiner" : "Candidate";
            sb.AppendLine($"{speaker}: {turn.Text}");
        }
        return sb.ToString();
    }
}
