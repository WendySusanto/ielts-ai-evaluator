using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface ISpeakingPromptService
    {
        Task<SpeakingPromptResponseDto> UpsertSpeakingPromptAsync(SpeakingPromptUpsertRequestDto payload);
        Task<SpeakingPromptResponseDto> GetSpeakingPromptAsync(Guid speakingPromptId);
        Task<SpeakingPromptListResponseDto> GetSpeakingPromptsAsync();
    }

    public class SpeakingPromptService : ISpeakingPromptService
    {
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<SpeakingPromptService> _logger;

        public SpeakingPromptService(
            EvaluatorDbContext dbContext,
            ILogger<SpeakingPromptService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<SpeakingPromptResponseDto> UpsertSpeakingPromptAsync(SpeakingPromptUpsertRequestDto payload)
        {
            try
            {
                if (payload == null)
                {
                    return new SpeakingPromptResponseDto
                    {
                        Success = false,
                        Message = "Invalid request payload."
                    };
                }

                SpeakingPrompt speakingPrompt;
                if (payload.SpeakingPromptId.HasValue)
                {
                    speakingPrompt = await _dbContext.SpeakingPrompts
                        .FirstOrDefaultAsync(p => p.SpeakingPromptId == payload.SpeakingPromptId.Value);

                    if (speakingPrompt == null)
                    {
                        return new SpeakingPromptResponseDto
                        {
                            Success = false,
                            Message = "Speaking prompt not found."
                        };
                    }
                }
                else
                {
                    speakingPrompt = new SpeakingPrompt
                    {
                        SpeakingPromptId = Guid.NewGuid()
                    };
                    _dbContext.SpeakingPrompts.Add(speakingPrompt);
                }

                speakingPrompt.Topic = payload.Topic;
                speakingPrompt.Description = payload.Description;
                speakingPrompt.Preview = payload.Preview;
                speakingPrompt.Part = payload.Part;
                speakingPrompt.QuestionText = payload.QuestionText;
                speakingPrompt.Cuepoints = payload.Cuepoints;
                speakingPrompt.Duration = payload.Duration;
                speakingPrompt.Level = payload.Level;

                await _dbContext.SaveChangesAsync();

                return new SpeakingPromptResponseDto
                {
                    Success = true,
                    Message = payload.SpeakingPromptId.HasValue
                        ? "Speaking prompt updated successfully."
                        : "Speaking prompt created successfully.",
                    Data = MapToDto(speakingPrompt)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing speaking prompt upsert.");
                return new SpeakingPromptResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<SpeakingPromptResponseDto> GetSpeakingPromptAsync(Guid speakingPromptId)
        {
            try
            {
                var speakingPrompt = await _dbContext.SpeakingPrompts
                    .FirstOrDefaultAsync(p => p.SpeakingPromptId == speakingPromptId && !p.IsDeleted);

                if (speakingPrompt == null)
                {
                    return new SpeakingPromptResponseDto
                    {
                        Success = false,
                        Message = "Speaking prompt not found."
                    };
                }

                return new SpeakingPromptResponseDto
                {
                    Success = true,
                    Message = "Speaking prompt retrieved successfully.",
                    Data = MapToDto(speakingPrompt)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving speaking prompt.");
                return new SpeakingPromptResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<SpeakingPromptListResponseDto> GetSpeakingPromptsAsync()
        {
            try
            {
                var speakingPrompts = await _dbContext.SpeakingPrompts
                    .Where(p => !p.IsDeleted)
                    .OrderByDescending(p => p.CreatedAt)
                    .Select(p => MapToDto(p))
                    .ToListAsync();

                return new SpeakingPromptListResponseDto
                {
                    Success = true,
                    Message = "Speaking prompts retrieved successfully.",
                    Data = speakingPrompts
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving speaking prompts.");
                return new SpeakingPromptListResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private static SpeakingPromptDto MapToDto(SpeakingPrompt prompt)
        {
            return new SpeakingPromptDto
            {
                SpeakingPromptId = prompt.SpeakingPromptId,
                Topic = prompt.Topic,
                Description = prompt.Description,
                Preview = prompt.Preview,
                Part = prompt.Part,
                QuestionText = prompt.QuestionText,
                Cuepoints = prompt.Cuepoints,
                Duration = prompt.Duration,
                Level = prompt.Level,
                CreatedAt = prompt.CreatedAt,
                UpdatedAt = prompt.UpdatedAt
            };
        }
    }
}
