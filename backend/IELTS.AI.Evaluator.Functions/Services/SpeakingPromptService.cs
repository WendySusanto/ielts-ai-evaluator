using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

public record SpeakingPromptUpsertRequest(Guid? SpeakingPromptId, string Topic, string Description, string Preview,
    string Part, string QuestionText, string? Cuepoints, int Duration, string Level, bool IsActive);

public record SpeakingPromptDto(Guid SpeakingPromptId, string Topic, string Description, string Preview,
    string Part, string QuestionText, string? Cuepoints, int Duration, string Level, bool IsActive,
    DateTime CreatedAt, DateTime UpdatedAt);

public interface ISpeakingPromptService
{
    Task<SpeakingPromptDto> UpsertAsync(SpeakingPromptUpsertRequest request);
    Task<SpeakingPromptDto> GetAsync(Guid id);
    Task<List<SpeakingPromptDto>> ListAsync(bool includeInactive);
}

public class SpeakingPromptService : ISpeakingPromptService
{
    private readonly EvaluatorDbContext _db;

    public SpeakingPromptService(EvaluatorDbContext db) => _db = db;

    public async Task<SpeakingPromptDto> UpsertAsync(SpeakingPromptUpsertRequest request)
    {
        SpeakingPrompt prompt;
        if (request.SpeakingPromptId is { } id)
        {
            prompt = await _db.SpeakingPrompts.FirstOrDefaultAsync(p => p.SpeakingPromptId == id)
                ?? throw new NotFoundException("Speaking prompt not found.");
        }
        else
        {
            prompt = new SpeakingPrompt { SpeakingPromptId = Guid.NewGuid() };
            _db.SpeakingPrompts.Add(prompt);
        }

        prompt.Topic = request.Topic;
        prompt.Description = request.Description;
        prompt.Preview = request.Preview;
        prompt.Part = request.Part;
        prompt.QuestionText = request.QuestionText;
        prompt.Cuepoints = request.Cuepoints;
        prompt.Duration = request.Duration;
        prompt.Level = request.Level;
        prompt.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        return new SpeakingPromptDto(prompt.SpeakingPromptId, prompt.Topic, prompt.Description, prompt.Preview,
            prompt.Part, prompt.QuestionText, prompt.Cuepoints, prompt.Duration, prompt.Level, prompt.IsActive,
            prompt.CreatedAt, prompt.UpdatedAt);
    }

    public async Task<SpeakingPromptDto> GetAsync(Guid id)
    {
        return await _db.SpeakingPrompts
            .Where(p => p.SpeakingPromptId == id && !p.IsDeleted)
            .Select(p => new SpeakingPromptDto(p.SpeakingPromptId, p.Topic, p.Description, p.Preview, p.Part,
                p.QuestionText, p.Cuepoints, p.Duration, p.Level, p.IsActive, p.CreatedAt, p.UpdatedAt))
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Speaking prompt not found.");
    }

    public async Task<List<SpeakingPromptDto>> ListAsync(bool includeInactive)
    {
        var query = _db.SpeakingPrompts.Where(p => !p.IsDeleted);
        if (!includeInactive) query = query.Where(p => p.IsActive);

        return await query
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new SpeakingPromptDto(p.SpeakingPromptId, p.Topic, p.Description, p.Preview, p.Part,
                p.QuestionText, p.Cuepoints, p.Duration, p.Level, p.IsActive, p.CreatedAt, p.UpdatedAt))
            .ToListAsync();
    }
}
