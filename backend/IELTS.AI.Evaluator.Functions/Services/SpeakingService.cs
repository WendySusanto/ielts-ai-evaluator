using System.Text;
using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services;

public record SpeakingEvaluateRequest(Guid SpeakingPromptId, string Part, List<SpeakingTurn> Turns);
public record SpeakingSessionDto(Guid SpeakingSessionId, decimal OverallBand, SpeakingFeedback Feedback);
public record SpeakingSessionHistoryItemDto(Guid SpeakingSessionId, string Part, string Topic, decimal OverallBand, DateTime CreatedAt);
public record SpeakingSessionDetailDto(Guid SpeakingSessionId, string Part, string Topic, string QuestionText,
    List<SpeakingTurn> Turns, decimal OverallBand, SpeakingFeedback Feedback, string? Pronunciation, DateTime CreatedAt);

public interface ISpeakingService
{
    Task<SpeakingSessionDto> EvaluateAsync(Guid userId, string role, SpeakingEvaluateRequest request);
    Task<List<SpeakingSessionHistoryItemDto>> GetHistoryAsync(Guid userId);
    Task<SpeakingSessionDetailDto> GetDetailAsync(Guid userId, Guid id);
}

public class SpeakingService : ISpeakingService
{
    private const int MaxTranscriptLength = 20_000;
    private const int MaxConversationLength = 30_000;
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    private readonly IGeminiStructuredClient _gemini;
    private readonly EvaluatorDbContext _db;
    private readonly IConfiguration _config;

    public SpeakingService(IGeminiStructuredClient gemini, EvaluatorDbContext db, IConfiguration config)
    {
        _gemini = gemini;
        _db = db;
        _config = config;
    }

    public async Task<SpeakingSessionDto> EvaluateAsync(Guid userId, string role, SpeakingEvaluateRequest request)
    {
        if (request.SpeakingPromptId == Guid.Empty || string.IsNullOrWhiteSpace(request.Part) || request.Turns is not { Count: > 0 })
            throw new ValidationException("Speaking prompt, part, and turns are required.");

        var candidateTurns = request.Turns.Where(t => t.Role.Equals("candidate", StringComparison.OrdinalIgnoreCase)).ToList();
        if (candidateTurns.Count == 0)
            throw new ValidationException("At least one candidate turn is required.");

        var transcriptLength = candidateTurns.Sum(t => t.Text?.Length ?? 0);
        if (transcriptLength > MaxTranscriptLength)
            throw new ValidationException("Transcript exceeds the maximum length of 20,000 characters.");

        // All turns (including examiner) are client-controlled and get rendered verbatim into the paid
        // Gemini call by BuildUserContent, so the candidate-only cap above isn't enough on its own.
        var conversationLength = request.Turns.Sum(t => t.Text?.Length ?? 0);
        if (conversationLength > MaxConversationLength)
            throw new ValidationException("Conversation exceeds the maximum length of 30,000 characters.");

        var prompt = await _db.SpeakingPrompts.FirstOrDefaultAsync(p => p.SpeakingPromptId == request.SpeakingPromptId)
            ?? throw new NotFoundException("Speaking prompt not found.");

        var isUnlimitedPlan = role.Equals("Premium", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        if (!isUnlimitedPlan)
        {
            var dailyLimit = int.TryParse(_config["DailySpeakingQuota"], out var configuredLimit) ? configuredLimit : 10;
            var todayUtc = DateTime.UtcNow.Date;
            // ponytail: COUNT-then-proceed is racy under concurrency; acceptable at this scale — move to a per-user lock or unique-per-day constraint if abuse appears.
            var usedToday = await _db.SpeakingSessions
                .CountAsync(s => s.UserId == userId && s.CreatedAt >= todayUtc);
            if (usedToday >= dailyLimit)
                throw new QuotaExceededException("Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.");
        }

        var userContent = BuildUserContent(prompt, request.Part, request.Turns);
        var result = await _gemini.GenerateAsync<SpeakingFeedback>(
            SpeakingFeedbackPrompts.SystemPrompt, userContent, SpeakingFeedbackPrompts.GeminiSchema);

        // Overall band is the average of the three Gemini-assessed criteria, rounded to the
        // nearest 0.5 — not whatever Gemini put in its own overallBand field. Pronunciation
        // (Azure PA, Phase 4) will fold into this average later.
        var overallBand = Math.Round(result.Value.Criteria.Average(c => c.Band) * 2, MidpointRounding.AwayFromZero) / 2;
        var feedback = result.Value with { OverallBand = overallBand };

        var session = new SpeakingSession
        {
            SpeakingSessionId = Guid.NewGuid(),
            UserId = userId,
            SpeakingPromptId = prompt.SpeakingPromptId,
            Part = request.Part,
            Turns = JsonSerializer.Serialize(request.Turns, CamelCase),
            OverallBand = overallBand,
            Feedback = JsonSerializer.Serialize(feedback, CamelCase),
            AiModel = result.Model,
            PromptTokens = result.PromptTokens,
            CompletionTokens = result.CompletionTokens,
        };

        _db.SpeakingSessions.Add(session);
        await _db.SaveChangesAsync();

        return new SpeakingSessionDto(session.SpeakingSessionId, session.OverallBand, feedback);
    }

    public async Task<List<SpeakingSessionHistoryItemDto>> GetHistoryAsync(Guid userId)
    {
        return await _db.SpeakingSessions
            .Include(s => s.SpeakingPrompt)
            .Where(s => s.UserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .Select(s => new SpeakingSessionHistoryItemDto(
                s.SpeakingSessionId, s.Part, s.SpeakingPrompt.Topic, s.OverallBand, s.CreatedAt))
            .ToListAsync();
    }

    public async Task<SpeakingSessionDetailDto> GetDetailAsync(Guid userId, Guid id)
    {
        var session = await _db.SpeakingSessions
            .Include(s => s.SpeakingPrompt)
            .FirstOrDefaultAsync(s => s.SpeakingSessionId == id && s.UserId == userId)
            ?? throw new NotFoundException("Speaking session not found.");

        var turns = JsonSerializer.Deserialize<List<SpeakingTurn>>(session.Turns, CamelCase)!;
        var feedback = JsonSerializer.Deserialize<SpeakingFeedback>(session.Feedback, CamelCase)!;
        return new SpeakingSessionDetailDto(
            session.SpeakingSessionId, session.Part, session.SpeakingPrompt.Topic, session.SpeakingPrompt.QuestionText,
            turns, session.OverallBand, feedback, session.Pronunciation, session.CreatedAt);
    }

    private static string BuildUserContent(SpeakingPrompt prompt, string part, List<SpeakingTurn> turns)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Part: {part}");
        sb.AppendLine($"Question: {prompt.QuestionText}");
        if (!string.IsNullOrWhiteSpace(prompt.Cuepoints))
            sb.AppendLine($"Cue points: {prompt.Cuepoints}");
        sb.AppendLine("Transcript:");
        foreach (var turn in turns)
        {
            var speaker = turn.Role.Equals("examiner", StringComparison.OrdinalIgnoreCase) ? "Examiner" : "Candidate";
            sb.AppendLine($"{speaker}: {turn.Text}");
        }
        return sb.ToString();
    }
}
