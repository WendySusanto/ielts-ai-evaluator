using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

public record NotebookCreateRequest(string Word, string? Meaning, string? Example, string? Replaces,
    string? Level, string Source, Guid? SourceId);

public record NotebookUpdateRequest(string Word, string? Meaning, string? Example, bool Mastered);

public record NotebookEntryDto(Guid NotebookEntryId, string Word, string? Meaning, string? Example,
    string? Replaces, string? Level, string Source, Guid? SourceId, bool Mastered, DateTime CreatedAt);

public interface INotebookService
{
    Task<List<NotebookEntryDto>> ListAsync(Guid userId);
    Task<NotebookEntryDto> CreateAsync(Guid userId, NotebookCreateRequest request);
    Task<NotebookEntryDto> UpdateAsync(Guid userId, Guid id, NotebookUpdateRequest request);
    Task DeleteAsync(Guid userId, Guid id);
    Task<WordSuggestion> SuggestAsync(string word, CancellationToken ct = default);
}

public class NotebookService : INotebookService
{
    private static readonly string[] Sources = ["Manual", "Writing", "Speaking"];

    private readonly EvaluatorDbContext _db;
    private readonly IGeminiStructuredClient _gemini;

    public NotebookService(EvaluatorDbContext db, IGeminiStructuredClient gemini)
    {
        _db = db;
        _gemini = gemini;
    }

    public async Task<List<NotebookEntryDto>> ListAsync(Guid userId)
    {
        return await _db.NotebookEntries
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .Select(n => ToDto(n))
            .ToListAsync();
    }

    /// <summary>Saving a word the user already has returns the existing entry instead of a
    /// duplicate, so a double-click on a bookmark or the same upgrade from two sessions is harmless.</summary>
    public async Task<NotebookEntryDto> CreateAsync(Guid userId, NotebookCreateRequest request)
    {
        var word = Required(request.Word, "Word", 100);
        if (!Sources.Contains(request.Source))
            throw new ValidationException("Source must be Manual, Writing or Speaking.");

        var existing = await FindByWordAsync(userId, word);
        if (existing is not null) return ToDto(existing);

        var entry = new NotebookEntry
        {
            NotebookEntryId = Guid.NewGuid(),
            UserId = userId,
            Word = word,
            Meaning = Optional(request.Meaning, "Meaning", 500),
            Example = Optional(request.Example, "Example", 500),
            Replaces = Optional(request.Replaces, "Replaces", 100),
            Level = Optional(request.Level, "Level", 10),
            Source = request.Source,
            SourceId = request.SourceId,
        };
        _db.NotebookEntries.Add(entry);
        await _db.SaveChangesAsync();
        return ToDto(entry);
    }

    public async Task<NotebookEntryDto> UpdateAsync(Guid userId, Guid id, NotebookUpdateRequest request)
    {
        var entry = await GetOwnedAsync(userId, id);
        var word = Required(request.Word, "Word", 100);

        var clash = await FindByWordAsync(userId, word);
        if (clash is not null && clash.NotebookEntryId != id)
            throw new ValidationException($"\"{word}\" is already in your notebook.");

        entry.Word = word;
        entry.Meaning = Optional(request.Meaning, "Meaning", 500);
        entry.Example = Optional(request.Example, "Example", 500);
        entry.Mastered = request.Mastered;
        await _db.SaveChangesAsync();
        return ToDto(entry);
    }

    /// <summary>Hard delete: a notebook entry has no history worth keeping, and a soft-deleted row
    /// would make re-adding the same word look like a duplicate.</summary>
    public async Task DeleteAsync(Guid userId, Guid id)
    {
        _db.NotebookEntries.Remove(await GetOwnedAsync(userId, id));
        await _db.SaveChangesAsync();
    }

    /// <summary>Checks the spelling of a word the learner typed and drafts its meaning and example.
    /// Nothing is saved — the learner edits the draft before adding it.</summary>
    // ponytail: no usage row, unlike ExaminerTurnUsage. A lookup is a few hundred tokens and the
    // rate limit caps it at 60/hour per user; record usage if this spend ever needs to be visible.
    public async Task<WordSuggestion> SuggestAsync(string word, CancellationToken ct = default)
    {
        var result = await _gemini.GenerateAsync<WordSuggestion>(
            WordSuggestionPrompts.SystemPrompt, Required(word, "Word", 100), WordSuggestionPrompts.GeminiSchema, ct,
            thinkingBudget: 0); // a dictionary lookup, not reasoning — the learner is waiting on it
        return result.Value;
    }

    // Another user's entry is reported as missing, not forbidden, so ids can't be probed.
    private async Task<NotebookEntry> GetOwnedAsync(Guid userId, Guid id) =>
        await _db.NotebookEntries.FirstOrDefaultAsync(n => n.NotebookEntryId == id && n.UserId == userId)
        ?? throw new NotFoundException("Notebook entry not found.");

    private Task<NotebookEntry?> FindByWordAsync(Guid userId, string word)
    {
        var lower = word.ToLower();
        return _db.NotebookEntries.FirstOrDefaultAsync(n => n.UserId == userId && n.Word.ToLower() == lower);
    }

    private static string Required(string? value, string field, int max) =>
        Optional(value, field, max) ?? throw new ValidationException($"{field} is required.");

    private static string? Optional(string? value, string field, int max)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        if (trimmed.Length > max) throw new ValidationException($"{field} must be at most {max} characters.");
        return trimmed;
    }

    private static NotebookEntryDto ToDto(NotebookEntry n) => new(n.NotebookEntryId, n.Word, n.Meaning,
        n.Example, n.Replaces, n.Level, n.Source, n.SourceId, n.Mastered, n.CreatedAt);
}
