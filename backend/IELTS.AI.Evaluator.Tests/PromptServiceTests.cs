using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Tests;

public class WritingPromptServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static WritingPromptUpsertRequest Request(Guid? id = null, bool isActive = true) => new(
        id, "Technology", "Describe the impact of technology.", "Preview text", "Opinion",
        "Does technology do more good than harm?", 40, 250, "Task2", "Academic", null, null, isActive);

    [Fact]
    public async Task Upsert_NoId_CreatesNewPrompt()
    {
        var svc = new WritingPromptService(NewDb());

        var result = await svc.UpsertAsync(Request());

        Assert.NotEqual(Guid.Empty, result.WritingPromptId);
        Assert.Equal("Technology", result.Topic);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task Upsert_WithId_UpdatesExistingPrompt()
    {
        var db = NewDb();
        var svc = new WritingPromptService(db);
        var created = await svc.UpsertAsync(Request());

        var updated = await svc.UpsertAsync(Request(created.WritingPromptId) with { Topic = "Environment" });

        Assert.Equal(created.WritingPromptId, updated.WritingPromptId);
        Assert.Equal("Environment", updated.Topic);
        Assert.Equal(1, await db.WritingPrompts.CountAsync());
    }

    [Fact]
    public async Task Upsert_UnknownId_ThrowsNotFound()
    {
        var svc = new WritingPromptService(NewDb());

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.UpsertAsync(Request(Guid.NewGuid())));
        Assert.Equal("Writing prompt not found.", ex.Message);
    }

    [Fact]
    public async Task Get_UnknownId_ThrowsNotFound()
    {
        var svc = new WritingPromptService(NewDb());

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.GetAsync(Guid.NewGuid()));
        Assert.Equal("Writing prompt not found.", ex.Message);
    }

    [Fact]
    public async Task List_ExcludesInactive_UnlessIncludeInactiveRequested()
    {
        var svc = new WritingPromptService(NewDb());
        await svc.UpsertAsync(Request(isActive: true));
        await svc.UpsertAsync(Request(isActive: false));

        var activeOnly = await svc.ListAsync(includeInactive: false);
        var all = await svc.ListAsync(includeInactive: true);

        Assert.Single(activeOnly);
        Assert.Equal(2, all.Count);
    }
}

public class SpeakingPromptServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static SpeakingPromptUpsertRequest Request(Guid? id = null, bool isActive = true) => new(
        id, "Hometown", "Describe your hometown.", "Preview text", "Part2",
        "Describe the place where you grew up.", "What it looks like\nWhy you like it", 120, "Academic", isActive);

    [Fact]
    public async Task Upsert_NoId_CreatesNewPrompt()
    {
        var svc = new SpeakingPromptService(NewDb());

        var result = await svc.UpsertAsync(Request());

        Assert.NotEqual(Guid.Empty, result.SpeakingPromptId);
        Assert.Equal("Hometown", result.Topic);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task Upsert_WithId_UpdatesExistingPrompt()
    {
        var db = NewDb();
        var svc = new SpeakingPromptService(db);
        var created = await svc.UpsertAsync(Request());

        var updated = await svc.UpsertAsync(Request(created.SpeakingPromptId) with { Topic = "Family" });

        Assert.Equal(created.SpeakingPromptId, updated.SpeakingPromptId);
        Assert.Equal("Family", updated.Topic);
        Assert.Equal(1, await db.SpeakingPrompts.CountAsync());
    }

    [Fact]
    public async Task Upsert_UnknownId_ThrowsNotFound()
    {
        var svc = new SpeakingPromptService(NewDb());

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.UpsertAsync(Request(Guid.NewGuid())));
        Assert.Equal("Speaking prompt not found.", ex.Message);
    }

    [Fact]
    public async Task Get_UnknownId_ThrowsNotFound()
    {
        var svc = new SpeakingPromptService(NewDb());

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.GetAsync(Guid.NewGuid()));
        Assert.Equal("Speaking prompt not found.", ex.Message);
    }

    [Fact]
    public async Task List_ExcludesInactive_UnlessIncludeInactiveRequested()
    {
        var svc = new SpeakingPromptService(NewDb());
        await svc.UpsertAsync(Request(isActive: true));
        await svc.UpsertAsync(Request(isActive: false));

        var activeOnly = await svc.ListAsync(includeInactive: false);
        var all = await svc.ListAsync(includeInactive: true);

        Assert.Single(activeOnly);
        Assert.Equal(2, all.Count);
    }
}
