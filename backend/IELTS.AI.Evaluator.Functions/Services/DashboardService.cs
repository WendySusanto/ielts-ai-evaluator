using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

public record DashboardRecentItemDto(Guid Id, string Type, string Topic, string TaskType, decimal OverallBand, DateTime CreatedAt);
public record DashboardBandPointDto(DateTime CreatedAt, decimal OverallBand, string Type);
public record DashboardDto(int WritingCount, int SpeakingCount, decimal? AverageBand,
    List<DashboardBandPointDto> BandTrend, List<DashboardRecentItemDto> RecentItems, DashboardFocusDto Focus, int WordsDue);

public interface IDashboardService
{
    Task<DashboardDto> GetDashboardAsync(Guid userId);
    Task<List<DashboardRecentItemDto>> GetRecentAsync(Guid userId, int take);
}

public class DashboardService : IDashboardService
{
    private const int TrendPoints = 20;
    private const int RecentDefault = 5;
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    private readonly EvaluatorDbContext _db;

    public DashboardService(EvaluatorDbContext db) => _db = db;

    public async Task<DashboardDto> GetDashboardAsync(Guid userId)
    {
        var writing = await WritingItemsAsync(userId, take: null);
        var speaking = await SpeakingItemsAsync(userId, take: null);
        var all = writing.Concat(speaking).OrderByDescending(e => e.CreatedAt).ToList();

        var bandTrend = all
            .OrderBy(e => e.CreatedAt)
            .TakeLast(TrendPoints)
            .Select(e => new DashboardBandPointDto(e.CreatedAt, e.OverallBand, e.Type))
            .ToList();

        var focus = FocusAreas.Compute(await WritingFocusAsync(userId), await SpeakingFocusAsync(userId));
        var now = DateTime.UtcNow;
        var wordsDue = await _db.NotebookEntries.CountAsync(n => n.UserId == userId && !n.Mastered && n.DueAt <= now);

        return new DashboardDto(
            WritingCount: writing.Count,
            SpeakingCount: speaking.Count,
            AverageBand: all.Count > 0 ? Math.Round(all.Average(e => e.OverallBand), 1) : null,
            BandTrend: bandTrend,
            RecentItems: all.Take(RecentDefault).ToList(),
            Focus: focus,
            WordsDue: wordsDue);
    }

    public async Task<List<DashboardRecentItemDto>> GetRecentAsync(Guid userId, int take)
    {
        var writing = await WritingItemsAsync(userId, take);
        var speaking = await SpeakingItemsAsync(userId, take);
        return writing.Concat(speaking).OrderByDescending(e => e.CreatedAt).Take(take).ToList();
    }

    private async Task<List<DashboardRecentItemDto>> WritingItemsAsync(Guid userId, int? take)
    {
        var query = _db.WritingEvaluations
            .Include(e => e.WritingPrompt)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new DashboardRecentItemDto(
                e.WritingEvaluationId, "writing", e.WritingPrompt.Topic, e.WritingPrompt.TaskType, e.OverallBand, e.CreatedAt));

        if (take is { } n) query = query.Take(n);
        return await query.ToListAsync();
    }

    private async Task<List<DashboardRecentItemDto>> SpeakingItemsAsync(Guid userId, int? take)
    {
        var query = _db.SpeakingSessions
            .Include(e => e.SpeakingPrompt)
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Select(e => new DashboardRecentItemDto(
                e.SpeakingSessionId, "speaking", e.SpeakingPrompt.Topic, e.Part, e.OverallBand, e.CreatedAt));

        if (take is { } n) query = query.Take(n);
        return await query.ToListAsync();
    }

    private async Task<List<FocusAreas.Evaluation>> WritingFocusAsync(Guid userId)
    {
        var rows = await _db.WritingEvaluations
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(FocusAreas.Window)
            .Select(e => new { e.CreatedAt, e.Feedback })
            .ToListAsync();
        return rows
            .Select(r => Parse<WritingFeedback>(r.Feedback) is { } f ? FocusAreas.FromWriting(r.CreatedAt, f) : null)
            .OfType<FocusAreas.Evaluation>()
            .ToList();
    }

    private async Task<List<FocusAreas.Evaluation>> SpeakingFocusAsync(Guid userId)
    {
        var rows = await _db.SpeakingSessions
            .Where(e => e.UserId == userId)
            .OrderByDescending(e => e.CreatedAt)
            .Take(FocusAreas.Window)
            .Select(e => new { e.CreatedAt, e.Feedback, e.Pronunciation })
            .ToListAsync();
        return rows
            .Select(r => Parse<SpeakingFeedback>(r.Feedback) is { } f
                ? FocusAreas.FromSpeaking(r.CreatedAt, f, r.Pronunciation is null ? null : Parse<PronunciationResult>(r.Pronunciation))
                : null)
            .OfType<FocusAreas.Evaluation>()
            .ToList();
    }

    /// <summary>A row whose JSON doesn't fit the record is left out of the focus card instead of
    /// failing the whole dashboard.</summary>
    private static T? Parse<T>(string json) where T : class
    {
        try { return JsonSerializer.Deserialize<T>(json, CamelCase); }
        catch (JsonException) { return null; }
    }
}
