using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IWritingPromptService
    {
        Task<WritingPromptResponseDto> UpsertWritingPromptAsync(WritingPromptUpsertRequestDto payload);
        Task<WritingPromptResponseDto> GetWritingPromptAsync(Guid writingPromptId);
        Task<WritingPromptListResponseDto> GetWritingPromptsAsync();
    }

    public class WritingPromptService : IWritingPromptService
    {
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<WritingPromptService> _logger;

        public WritingPromptService(
            EvaluatorDbContext dbContext,
            ILogger<WritingPromptService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<WritingPromptResponseDto> UpsertWritingPromptAsync(WritingPromptUpsertRequestDto payload)
        {
            try
            {
                if (payload == null)
                {
                    return new WritingPromptResponseDto
                    {
                        Success = false,
                        Message = "Invalid request payload."
                    };
                }

                WritingPrompt writingPrompt;
                if (payload.WritingPromptId.HasValue)
                {
                    writingPrompt = await _dbContext.WritingPrompts
                        .FirstOrDefaultAsync(w => w.WritingPromptId == payload.WritingPromptId.Value);

                    if (writingPrompt == null)
                    {
                        return new WritingPromptResponseDto
                        {
                            Success = false,
                            Message = "Writing prompt not found."
                        };
                    }
                }
                else
                {
                    writingPrompt = new WritingPrompt
                    {
                        WritingPromptId = Guid.NewGuid()
                    };
                    _dbContext.WritingPrompts.Add(writingPrompt);
                }

                // Update properties
                writingPrompt.Topic = payload.Topic;
                writingPrompt.Description = payload.Description;
                writingPrompt.Preview = payload.Preview;
                writingPrompt.QuestionType = payload.QuestionType;
                writingPrompt.QuestionText = payload.QuestionText;
                writingPrompt.Duration = payload.Duration;
                writingPrompt.MinimumWords = payload.MinimumWords;
                writingPrompt.TaskType = payload.TaskType;
                writingPrompt.Level = payload.Level;
                writingPrompt.ImageUrl = payload.ImageUrl;

                await _dbContext.SaveChangesAsync();

                return new WritingPromptResponseDto
                {
                    Success = true,
                    Message = payload.WritingPromptId.HasValue ? "Writing prompt updated successfully." : "Writing prompt created successfully.",
                    Data = MapToDto(writingPrompt)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing writing prompt upsert.");
                return new WritingPromptResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<WritingPromptResponseDto> GetWritingPromptAsync(Guid writingPromptId)
        {
            try
            {
                var writingPrompt = await _dbContext.WritingPrompts
                    .FirstOrDefaultAsync(w => w.WritingPromptId == writingPromptId && !w.IsDeleted);

                if (writingPrompt == null)
                {
                    return new WritingPromptResponseDto
                    {
                        Success = false,
                        Message = "Writing prompt not found."
                    };
                }

                return new WritingPromptResponseDto
                {
                    Success = true,
                    Message = "Writing prompt retrieved successfully.",
                    Data = MapToDto(writingPrompt)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving writing prompt.");
                return new WritingPromptResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<WritingPromptListResponseDto> GetWritingPromptsAsync()
        {
            try
            {
                var writingPrompts = await _dbContext.WritingPrompts
                    .Where(w => !w.IsDeleted)
                    .OrderByDescending(w => w.CreatedAt)
                    .Select(w => MapToDto(w))
                    .ToListAsync();

                return new WritingPromptListResponseDto
                {
                    Success = true,
                    Message = "Writing prompts retrieved successfully.",
                    Data = writingPrompts
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving writing prompts.");
                return new WritingPromptListResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private static WritingPromptDto MapToDto(WritingPrompt writingPrompt)
        {
            return new WritingPromptDto
            {
                WritingPromptId = writingPrompt.WritingPromptId,
                Topic = writingPrompt.Topic,
                Description = writingPrompt.Description,
                Preview = writingPrompt.Preview,
                QuestionType = writingPrompt.QuestionType,
                QuestionText = writingPrompt.QuestionText,
                Duration = writingPrompt.Duration,
                MinimumWords = writingPrompt.MinimumWords,
                TaskType = writingPrompt.TaskType,
                Level = writingPrompt.Level,
                ImageUrl = writingPrompt.ImageUrl,
                CreatedAt = writingPrompt.CreatedAt,
                UpdatedAt = writingPrompt.UpdatedAt
            };
        }
    }
}