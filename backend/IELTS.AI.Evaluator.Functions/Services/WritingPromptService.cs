using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

public record WritingPromptUpsertRequest(Guid? WritingPromptId, string Topic, string Description, string Preview,
    string QuestionType, string QuestionText, int Duration, int MinimumWords, string TaskType, string Level,
    string? ImageUrl, string? ImageDescription, bool IsActive);

public record WritingPromptDto(Guid WritingPromptId, string Topic, string Description, string Preview,
    string QuestionType, string QuestionText, int Duration, int MinimumWords, string TaskType, string Level,
    string? ImageUrl, string? ImageDescription, bool IsActive, DateTime CreatedAt, DateTime UpdatedAt);

public interface IWritingPromptService
{
    Task<WritingPromptDto> UpsertAsync(WritingPromptUpsertRequest request);
    Task<WritingPromptDto> GetAsync(Guid id);
    Task<List<WritingPromptDto>> ListAsync(bool includeInactive);
}

public class WritingPromptService : IWritingPromptService
{
    private readonly EvaluatorDbContext _db;

    public WritingPromptService(EvaluatorDbContext db) => _db = db;

    public async Task<WritingPromptDto> UpsertAsync(WritingPromptUpsertRequest request)
    {
        WritingPrompt prompt;
        if (request.WritingPromptId is { } id)
        {
            prompt = await _db.WritingPrompts.FirstOrDefaultAsync(w => w.WritingPromptId == id)
                ?? throw new NotFoundException("Writing prompt not found.");
        }
        else
        {
            prompt = new WritingPrompt { WritingPromptId = Guid.NewGuid() };
            _db.WritingPrompts.Add(prompt);
        }

        prompt.Topic = request.Topic;
        prompt.Description = request.Description;
        prompt.Preview = request.Preview;
        prompt.QuestionType = request.QuestionType;
        prompt.QuestionText = request.QuestionText;
        prompt.Duration = request.Duration;
        prompt.MinimumWords = request.MinimumWords;
        prompt.TaskType = request.TaskType;
        prompt.Level = request.Level;
        prompt.ImageUrl = request.ImageUrl;
        prompt.ImageDescription = request.ImageDescription;
        prompt.IsActive = request.IsActive;

        await _db.SaveChangesAsync();

        return new WritingPromptDto(prompt.WritingPromptId, prompt.Topic, prompt.Description, prompt.Preview,
            prompt.QuestionType, prompt.QuestionText, prompt.Duration, prompt.MinimumWords, prompt.TaskType,
            prompt.Level, prompt.ImageUrl, prompt.ImageDescription, prompt.IsActive, prompt.CreatedAt, prompt.UpdatedAt);
    }

    public async Task<WritingPromptDto> GetAsync(Guid id)
    {
        return await _db.WritingPrompts
            .Where(w => w.WritingPromptId == id && !w.IsDeleted)
            .Select(w => new WritingPromptDto(w.WritingPromptId, w.Topic, w.Description, w.Preview, w.QuestionType,
                w.QuestionText, w.Duration, w.MinimumWords, w.TaskType, w.Level, w.ImageUrl, w.ImageDescription,
                w.IsActive, w.CreatedAt, w.UpdatedAt))
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("Writing prompt not found.");
    }

    public async Task<List<WritingPromptDto>> ListAsync(bool includeInactive)
    {
        var query = _db.WritingPrompts.Where(w => !w.IsDeleted);
        if (!includeInactive) query = query.Where(w => w.IsActive);

        return await query
            .OrderByDescending(w => w.CreatedAt)
            .Select(w => new WritingPromptDto(w.WritingPromptId, w.Topic, w.Description, w.Preview, w.QuestionType,
                w.QuestionText, w.Duration, w.MinimumWords, w.TaskType, w.Level, w.ImageUrl, w.ImageDescription,
                w.IsActive, w.CreatedAt, w.UpdatedAt))
            .ToListAsync();
    }
}
