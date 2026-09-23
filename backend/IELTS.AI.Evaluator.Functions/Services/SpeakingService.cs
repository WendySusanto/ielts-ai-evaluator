using System.Text;
using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services;

public record SpeakingEvaluateRequest(Guid SpeakingPromptId, string Part, List<SpeakingTurn> Turns,
    PronunciationResult? Pronunciation = null); // Band on input is ignored — the service always recomputes it.
public record SpeakingSessionDto(Guid SpeakingSessionId, decimal OverallBand, SpeakingFeedback Feedback);
public record SpeakingSessionHistoryItemDto(Guid SpeakingSessionId, string Part, string Topic, decimal OverallBand, DateTime CreatedAt);
public record SpeakingSessionDetailDto(Guid SpeakingSessionId, string Part, string Topic, string QuestionText,
    List<SpeakingTurn> Turns, decimal OverallBand, SpeakingFeedback Feedback, PronunciationResult? Pronunciation, DateTime CreatedAt);

public interface ISpeakingService
{
    /// <summary>Same token contract as IWritingService.EvaluateAsync: it aborts before Gemini is
    /// paid, never after.</summary>
    Task<SpeakingSessionDto> EvaluateAsync(Guid userId, string role, SpeakingEvaluateRequest request,
        CancellationToken ct = default);
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

    public async Task<SpeakingSessionDto> EvaluateAsync(Guid userId, string role, SpeakingEvaluateRequest request,
        CancellationToken ct = default)
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
        ValidateConversationCap(request.Turns);

        var prompt = await _db.SpeakingPrompts.FirstOrDefaultAsync(p => p.SpeakingPromptId == request.SpeakingPromptId, ct)
            ?? throw new NotFoundException("Speaking prompt not found.");

        var isUnlimitedPlan = role.Equals("Premium", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        if (!isUnlimitedPlan)
        {
            var dailyLimit = int.TryParse(_config["DailySpeakingQuota"], out var configuredLimit) ? configuredLimit : 10;
            var todayUtc = DateTime.UtcNow.Date;
            // ponytail: COUNT-then-proceed is racy under concurrency; acceptable at this scale — move to a per-user lock or unique-per-day constraint if abuse appears.
            var usedToday = await _db.SpeakingSessions
                .CountAsync(s => s.UserId == userId && s.CreatedAt >= todayUtc, ct);
            if (usedToday >= dailyLimit)
                throw new QuotaExceededException("Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.");
        }

        // Pronunciation (Azure PA) is client-aggregated but never client-scored: the band is always
        // recomputed here from the raw pronunciationScore, never trusted from the wire.
        var pronunciation = request.Pronunciation is { } pa ? pa with { Band = RoundToHalf(pa.PronunciationScore / 100 * 9) } : null;
        if (pronunciation is not null)
            ValidatePronunciation(pronunciation);

        var userContent = BuildUserContent(prompt, request.Part, request.Turns, pronunciation);
        var result = await _gemini.GenerateAsync<SpeakingFeedback>(
            SpeakingFeedbackPrompts.SystemPrompt, userContent, SpeakingFeedbackPrompts.GeminiSchema, ct,
            temperature: 0); // scoring is reproducible; only the examiner's questions want variety

        // Overall band is the average of the three Gemini-assessed criteria plus, when present, the
        // Azure PA band, rounded to the nearest 0.5 — not whatever Gemini put in its own overallBand field.
        var bands = result.Value.Criteria.Select(c => c.Band);
        if (pronunciation is not null)
            bands = bands.Append(pronunciation.Band);
        var overallBand = RoundToHalf(bands.Average());
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
            Pronunciation = pronunciation is null ? null : JsonSerializer.Serialize(pronunciation, CamelCase),
            AiModel = result.Model,
            PromptTokens = result.PromptTokens,
            CompletionTokens = result.CompletionTokens,
        };

        _db.SpeakingSessions.Add(session);
        // Deliberately not ct — same reason as WritingService: the Gemini call is already billed,
        // and a whole spoken session's feedback is not worth discarding over a closed tab.
        await _db.SaveChangesAsync(CancellationToken.None);

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
        var pronunciation = session.Pronunciation is null
            ? null
            : JsonSerializer.Deserialize<PronunciationResult>(session.Pronunciation, CamelCase);
        return new SpeakingSessionDetailDto(
            session.SpeakingSessionId, session.Part, session.SpeakingPrompt.Topic, session.SpeakingPrompt.QuestionText,
            turns, session.OverallBand, feedback, pronunciation, session.CreatedAt);
    }

    private static decimal RoundToHalf(decimal value) => Math.Round(value * 2, MidpointRounding.AwayFromZero) / 2;

    private static void ValidatePronunciation(PronunciationResult pa)
    {
        var scores = new[] { pa.PronunciationScore, pa.AccuracyScore, pa.FluencyScore, pa.ProsodyScore, pa.CompletenessScore };
        // NRT isn't runtime-enforced through System.Text.Json — "words": null on the wire lands here as null.
        if (scores.Any(s => s < 0 || s > 100) || pa.Words is null || pa.Words.Count > 400)
            throw new ValidationException("Invalid pronunciation assessment data.");
    }

    /// <summary>Shared with ExaminerService: the combined-turns cap protects the paid Gemini call
    /// regardless of which endpoint is building the prompt from client-controlled turns.</summary>
    internal static void ValidateConversationCap(List<SpeakingTurn> turns)
    {
        var conversationLength = turns.Sum(t => t.Text?.Length ?? 0);
        if (conversationLength > MaxConversationLength)
            throw new ValidationException("Conversation exceeds the maximum length of 30,000 characters.");
    }

    private static string BuildUserContent(SpeakingPrompt prompt, string part, List<SpeakingTurn> turns,
        PronunciationResult? pronunciation)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Part: {part}");
        sb.AppendLine($"Question: {prompt.QuestionText}");
        if (!string.IsNullOrWhiteSpace(prompt.Cuepoints))
            sb.AppendLine($"Cue points: {prompt.Cuepoints}");
        // Gemini only ever sees text, so this is the one hesitation/pacing signal it gets for the
        // Fluency and Coherence band. Stated explicitly when absent so it scores blind knowingly.
        sb.AppendLine(pronunciation is null
            ? "Measured speech fluency: not available (no spoken audio was assessed for this session)."
            : $"Measured speech fluency (0-100, from pause length, pause placement and speech rate): {pronunciation.FluencyScore:F0}");
        sb.AppendLine("Transcript:");
        foreach (var turn in turns)
        {
            var speaker = turn.Role.Equals("examiner", StringComparison.OrdinalIgnoreCase) ? "Examiner" : "Candidate";
            sb.AppendLine($"{speaker}: {turn.Text}");
        }
        return sb.ToString();
    }
}
