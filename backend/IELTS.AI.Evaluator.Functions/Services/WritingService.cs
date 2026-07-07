using System.Text;
using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services;

public record WritingEvaluateRequest(Guid WritingPromptId, string EssayText);
public record WritingEvaluationDto(Guid WritingEvaluationId, decimal OverallBand, WritingFeedback Feedback);
public record WritingHistoryItemDto(Guid WritingEvaluationId, string TaskType, string Topic, decimal OverallBand, int WordCount, DateTime CreatedAt);
public record WritingEvaluationDetailDto(Guid WritingEvaluationId, string TaskType, string Topic, string QuestionText,
    string EssayText, int WordCount, decimal OverallBand, WritingFeedback Feedback, DateTime CreatedAt);

public interface IWritingService
{
    Task<WritingEvaluationDto> EvaluateAsync(Guid userId, string role, WritingEvaluateRequest request);
    Task<List<WritingHistoryItemDto>> GetHistoryAsync(Guid userId);
    Task<WritingEvaluationDetailDto> GetDetailAsync(Guid userId, Guid id);
}

public class WritingService : IWritingService
{
    private const int MaxEssayLength = 10_000;
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    private readonly IGeminiStructuredClient _gemini;
    private readonly EvaluatorDbContext _db;
    private readonly IConfiguration _config;

    public WritingService(IGeminiStructuredClient gemini, EvaluatorDbContext db, IConfiguration config)
    {
        _gemini = gemini;
        _db = db;
        _config = config;
    }

    public async Task<WritingEvaluationDto> EvaluateAsync(Guid userId, string role, WritingEvaluateRequest request)
    {
        if (request.WritingPromptId == Guid.Empty || string.IsNullOrWhiteSpace(request.EssayText))
            throw new ValidationException("Essay text and writing prompt are required.");
        if (request.EssayText.Length > MaxEssayLength)
            throw new ValidationException("Essay exceeds the maximum length of 10,000 characters.");

        var prompt = await _db.WritingPrompts.FirstOrDefaultAsync(p => p.WritingPromptId == request.WritingPromptId)
            ?? throw new NotFoundException("Writing prompt not found.");

        var isUnlimitedPlan = role.Equals("Premium", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Admin", StringComparison.OrdinalIgnoreCase);
        if (!isUnlimitedPlan)
        {
            var dailyLimit = int.TryParse(_config["DailyWritingQuota"], out var configuredLimit) ? configuredLimit : 10;
            var todayUtc = DateTime.UtcNow.Date;
            // ponytail: COUNT-then-proceed is racy under concurrency; acceptable at this scale — move to a per-user lock or unique-per-day constraint if abuse appears.
            var usedToday = await _db.WritingEvaluations
                .CountAsync(e => e.UserId == userId && e.CreatedAt >= todayUtc);
            if (usedToday >= dailyLimit)
                throw new QuotaExceededException("Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.");
        }

        var userContent = BuildUserContent(prompt, request.EssayText);
        var result = await _gemini.GenerateAsync<WritingFeedback>(
            WritingFeedbackPrompts.SystemPrompt, userContent, WritingFeedbackPrompts.GeminiSchema);

        var wordCount = request.EssayText.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries).Length;
        var evaluation = new WritingEvaluation
        {
            WritingEvaluationId = Guid.NewGuid(),
            UserId = userId,
            WritingPromptId = prompt.WritingPromptId,
            EssayText = request.EssayText,
            WordCount = wordCount,
            OverallBand = result.Value.OverallBand,
            Feedback = JsonSerializer.Serialize(result.Value, CamelCase),
            AiModel = result.Model,
            PromptTokens = result.PromptTokens,
            CompletionTokens = result.CompletionTokens,
        };

        _db.WritingEvaluations.Add(evaluation);
        await _db.SaveChangesAsync();

        return new WritingEvaluationDto(evaluation.WritingEvaluationId, evaluation.OverallBand, result.Value);
    }

    public async Task<List<WritingHistoryItemDto>> GetHistoryAsync(Guid userId)
    {
        return await _db.WritingEvaluations
            .Include(e => e.WritingPrompt)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new WritingHistoryItemDto(
                e.WritingEvaluationId, e.WritingPrompt.TaskType, e.WritingPrompt.Topic, e.OverallBand, e.WordCount, e.CreatedAt))
            .ToListAsync();
    }

    public async Task<WritingEvaluationDetailDto> GetDetailAsync(Guid userId, Guid id)
    {
        var eval = await _db.WritingEvaluations
            .Include(e => e.WritingPrompt)
            .FirstOrDefaultAsync(e => e.WritingEvaluationId == id && e.UserId == userId)
            ?? throw new NotFoundException("Evaluation not found.");

        var feedback = JsonSerializer.Deserialize<WritingFeedback>(eval.Feedback, CamelCase)!;
        return new WritingEvaluationDetailDto(
            eval.WritingEvaluationId, eval.WritingPrompt.TaskType, eval.WritingPrompt.Topic, eval.WritingPrompt.QuestionText,
            eval.EssayText, eval.WordCount, eval.OverallBand, feedback, eval.CreatedAt);
    }

    private static string BuildUserContent(WritingPrompt prompt, string essayText)
    {
        var sb = new StringBuilder();
        sb.AppendLine($"Task type: {prompt.TaskType}");
        sb.AppendLine($"Question: {prompt.QuestionText}");
        if (prompt.TaskType.Contains('1') && !string.IsNullOrWhiteSpace(prompt.ImageDescription))
            sb.AppendLine($"Image description: {prompt.ImageDescription}");
        sb.AppendLine("Essay:");
        sb.AppendLine(essayText);
        return sb.ToString();
    }
}
