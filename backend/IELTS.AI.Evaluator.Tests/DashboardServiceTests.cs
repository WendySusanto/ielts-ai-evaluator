using IELTS.AI.Evaluator.Data.Models;
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

    private static void AddWriting(EvaluatorDbContext db, Guid userId, decimal band, DateTime createdAt)
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
            Feedback = "{}",
            CreatedAt = createdAt,
        });
        db.SaveChanges();
    }

    private static void AddSpeaking(EvaluatorDbContext db, Guid userId, decimal band, DateTime createdAt)
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
            Feedback = "{}",
            CreatedAt = createdAt,
        });
        db.SaveChanges();
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
