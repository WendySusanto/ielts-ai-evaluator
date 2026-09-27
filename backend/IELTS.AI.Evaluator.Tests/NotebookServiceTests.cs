using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Tests;

public class NotebookServiceTests
{
    private static readonly Guid Alice = Guid.NewGuid();
    private static readonly Guid Bob = Guid.NewGuid();

    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static NotebookCreateRequest Create(string word = "substantial", string source = "Writing") =>
        new(word, null, "The city grew very big.", "very big", null, source, Guid.NewGuid());

    [Fact]
    public async Task Create_TrimsAndStoresEntry()
    {
        var svc = new NotebookService(NewDb());

        var entry = await svc.CreateAsync(Alice, Create("  substantial  "));

        Assert.Equal("substantial", entry.Word);
        Assert.Equal("very big", entry.Replaces);
        Assert.Equal("Writing", entry.Source);
        Assert.False(entry.Mastered);
    }

    [Fact]
    public async Task Create_SameWordDifferentCase_ReturnsExistingEntry()
    {
        var db = NewDb();
        var svc = new NotebookService(db);
        var first = await svc.CreateAsync(Alice, Create("Substantial"));

        var second = await svc.CreateAsync(Alice, Create("substantial"));

        Assert.Equal(first.NotebookEntryId, second.NotebookEntryId);
        Assert.Equal(1, await db.NotebookEntries.CountAsync());
    }

    [Fact]
    public async Task Create_SameWordForAnotherUser_CreatesSeparateEntry()
    {
        var db = NewDb();
        var svc = new NotebookService(db);
        await svc.CreateAsync(Alice, Create());

        await svc.CreateAsync(Bob, Create());

        Assert.Equal(2, await db.NotebookEntries.CountAsync());
    }

    [Theory]
    [InlineData("   ", "Manual")]
    [InlineData("word", "Reading")]
    public async Task Create_InvalidInput_ThrowsValidation(string word, string source)
    {
        var svc = new NotebookService(NewDb());

        await Assert.ThrowsAsync<ValidationException>(() => svc.CreateAsync(Alice, Create(word, source)));
    }

    [Fact]
    public async Task Create_TooLongWord_ThrowsValidation()
    {
        var svc = new NotebookService(NewDb());

        await Assert.ThrowsAsync<ValidationException>(() => svc.CreateAsync(Alice, Create(new string('a', 101))));
    }

    [Fact]
    public async Task List_ReturnsOnlyOwnEntries()
    {
        var svc = new NotebookService(NewDb());
        await svc.CreateAsync(Alice, Create("substantial"));
        await svc.CreateAsync(Bob, Create("exacerbate"));

        var list = await svc.ListAsync(Alice);

        Assert.Equal("substantial", Assert.Single(list).Word);
    }

    [Fact]
    public async Task Update_ChangesEditableFields()
    {
        var svc = new NotebookService(NewDb());
        var entry = await svc.CreateAsync(Alice, Create());

        var updated = await svc.UpdateAsync(Alice, entry.NotebookEntryId,
            new NotebookUpdateRequest("considerable", "large in size", "  ", true));

        Assert.Equal("considerable", updated.Word);
        Assert.Equal("large in size", updated.Meaning);
        Assert.Null(updated.Example);
        Assert.True(updated.Mastered);
        Assert.Equal("very big", updated.Replaces);
    }

    [Fact]
    public async Task Update_SameWordOnSameEntry_IsAllowed()
    {
        var svc = new NotebookService(NewDb());
        var entry = await svc.CreateAsync(Alice, Create("substantial"));

        var updated = await svc.UpdateAsync(Alice, entry.NotebookEntryId,
            new NotebookUpdateRequest("Substantial", null, null, true));

        Assert.Equal("Substantial", updated.Word);
    }

    [Fact]
    public async Task Update_RenameToExistingWord_ThrowsValidation()
    {
        var svc = new NotebookService(NewDb());
        await svc.CreateAsync(Alice, Create("substantial"));
        var other = await svc.CreateAsync(Alice, Create("considerable"));

        await Assert.ThrowsAsync<ValidationException>(() => svc.UpdateAsync(Alice, other.NotebookEntryId,
            new NotebookUpdateRequest("SUBSTANTIAL", null, null, false)));
    }

    [Fact]
    public async Task UpdateAndDelete_OtherUsersEntry_ThrowNotFound()
    {
        var svc = new NotebookService(NewDb());
        var entry = await svc.CreateAsync(Alice, Create());

        await Assert.ThrowsAsync<NotFoundException>(() => svc.UpdateAsync(Bob, entry.NotebookEntryId,
            new NotebookUpdateRequest("x", null, null, false)));
        await Assert.ThrowsAsync<NotFoundException>(() => svc.DeleteAsync(Bob, entry.NotebookEntryId));
    }

    [Fact]
    public async Task Delete_RemovesEntry_AndWordCanBeAddedAgain()
    {
        var db = NewDb();
        var svc = new NotebookService(db);
        var entry = await svc.CreateAsync(Alice, Create());

        await svc.DeleteAsync(Alice, entry.NotebookEntryId);
        var readded = await svc.CreateAsync(Alice, Create());

        Assert.NotEqual(entry.NotebookEntryId, readded.NotebookEntryId);
        Assert.Equal(1, await db.NotebookEntries.CountAsync());
    }
}
