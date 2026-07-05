using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.IO;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Linq;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IEssayEvaluationService
    {
        Task<EssayEvaluationResponseDto> EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload);
        Task<EvaluationHistoryResponseDto> GetEvaluationHistoryAsync(Guid userId);
        Task<EvaluationDetailResponseDto> GetEvaluationDetailAsync(Guid userId, Guid essayEvaluationId);
    }

    public class EssayEvaluationService : IEssayEvaluationService
    {
        private const int MaxEssayLength = 10_000;

        private readonly IGeminiApiClient _geminiApiClient;
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<EssayEvaluationService> _logger;
        private readonly IConfiguration _configuration;
        //private readonly string _sampleJsonPath = "C:\\Workspace\\ielts-ai-evaluator\\backend\\IELTS.AI.Evaluator.Functions\\bin\\Debug\\net8.0\\Data\\sampleAIResponse.json";

        public EssayEvaluationService(
            IGeminiApiClient geminiApiClient,
            EvaluatorDbContext dbContext,
            ILogger<EssayEvaluationService> logger,
            IConfiguration configuration)
        {
            _geminiApiClient = geminiApiClient;
            _dbContext = dbContext;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<EssayEvaluationResponseDto> EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.UserAnswer) || payload.WritingPromptId == Guid.Empty)
            {
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Invalid request payload."
                };
            }

            if (payload.UserAnswer.Length > MaxEssayLength)
            {
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Essay exceeds the maximum length of 10,000 characters."
                };
            }

            var geminiApiKey = _configuration["GeminiApiKey"];
            if (string.IsNullOrWhiteSpace(geminiApiKey))
            {
                _logger.LogError("Gemini API key is missing.");
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Gemini API key is missing."
                };
            }

            try
            {
                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                var writingPrompt = await _dbContext.WritingPrompts.FirstOrDefaultAsync(wp => wp.WritingPromptId == payload.WritingPromptId);
                if (user == null || writingPrompt == null)
                {
                    return new EssayEvaluationResponseDto
                    {
                        Success = false,
                        Message = "User or WritingPrompt not found."
                    };
                }

                var isUnlimitedPlan = user.Plan?.ToLowerInvariant() is "premium" or "admin";
                if (!isUnlimitedPlan)
                {
                    var dailyLimit = int.TryParse(_configuration["DailyWritingQuota"], out var configuredLimit) ? configuredLimit : 10;
                    var todayUtc = DateTime.UtcNow.Date;
                    var usedToday = await _dbContext.EssayEvaluations
                        .CountAsync(e => e.User.UserId == userId && e.CreatedAt >= todayUtc);
                    if (usedToday >= dailyLimit)
                    {
                        return new EssayEvaluationResponseDto
                        {
                            Success = false,
                            Message = "Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations."
                        };
                    }
                }

                // Read sample AI response from file for development
                //string aiResponseJson;
                //try
                //{
                //    aiResponseJson = File.ReadAllText(_sampleJsonPath);
                //}
                //catch (Exception fileEx)
                //{
                //    _logger.LogError(fileEx, $"Could not read sample AI response file: {_sampleJsonPath}");
                //    return new EssayEvaluationResponseDto
                //    {
                //        Success = false,
                //        Message = "Sample AI response file not found or unreadable."
                //    };
                //}

                string aiResponseJson = await _geminiApiClient.EvaluateEssayAsync(payload.UserAnswer, payload.ImageDescription, payload.Question, payload.TaskType, geminiApiKey);

                _logger.LogInformation(aiResponseJson);

                var aiResponse = JsonDocument.Parse(aiResponseJson);
                var overallBand = ExtractOverallBand(aiResponse);
                var aiModel = aiResponse.RootElement.GetProperty("modelVersion").GetString();
                var promptTokenCount = GetSafeTokenCount(aiResponse, "usageMetadata", "promptTokenCount");
                var candidatesTokenCount = GetSafeTokenCount(aiResponse, "usageMetadata", "candidatesTokenCount");

                var essayEvaluationId = Guid.NewGuid();
                var essayEvaluation = new EssayEvaluation
                {
                    EssayEvaluationId = essayEvaluationId,
                    OverallBand = overallBand,
                    RawJson = aiResponseJson,
                    UserAnswer = payload.UserAnswer,
                    User = user,
                    WritingPrompt = writingPrompt,
                    AiModel = aiModel ?? string.Empty,
                    PromptTokenCount = promptTokenCount,
                    CandidatesTokenCount = candidatesTokenCount
                };

                user.WritingQuotaUsed += 1;

                _dbContext.EssayEvaluations.Add(essayEvaluation);
                await _dbContext.SaveChangesAsync();

                return new EssayEvaluationResponseDto
                {
                    Success = true,
                    Message = "Evaluation successful.",
                    Data = new EssayEvaluationDataDto
                    {
                        EssayEvaluationId = essayEvaluationId,
                        OverallBand = overallBand,
                        RawJson = aiResponseJson,
                        AiModel = aiModel ?? string.Empty,
                        PromptTokenCount = promptTokenCount,
                        CandidatesTokenCount = candidatesTokenCount
                    }
                };
            }
            catch (JsonException ex)
            {
                _logger.LogError(ex, "Invalid JSON in request or AI response.");
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Invalid JSON format."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing essay evaluation.");
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private decimal ExtractOverallBand(JsonDocument aiResponse)
        {
            try
            {
                var candidates = aiResponse.RootElement.GetProperty("candidates");
                var content = candidates[0].GetProperty("content");
                var parts = content.GetProperty("parts");
                var text = parts[0].GetProperty("text").GetString();
         

                string cleanedJson = text.Trim()
                        .Replace("```json", "")
                        .Replace("```", "")
                        .Trim();

                var blockDoc = JsonDocument.Parse(cleanedJson);
                var overallBand = blockDoc.RootElement.GetProperty("overallBand").GetDecimal();
                return overallBand;
            }
            catch
            {
                return 0;
            }
        }

        public async Task<EvaluationHistoryResponseDto> GetEvaluationHistoryAsync(Guid userId)
        {
            try
            {
                var evaluations = await _dbContext.EssayEvaluations
                    .Include(e => e.WritingPrompt)
                    .Where(e => e.User.UserId == userId)
                    .OrderByDescending(e => e.CreatedAt)
                    .ToListAsync();

                var result = new EvaluationHistoryResponseDto { Success = true };
                foreach (var eval in evaluations)
                {
                    var feedback = DeserializeFeedback(eval.RawJson);
                    result.Data.Add(new EvaluationHistoryItemDto
                    {
                        EssayEvaluationId = eval.EssayEvaluationId,
                        TaskType = eval.WritingPrompt?.TaskType ?? string.Empty,
                        Topic = eval.WritingPrompt?.Topic ?? string.Empty,
                        OverallBand = eval.OverallBand,
                        CreatedAt = eval.CreatedAt,
                        Feedback = feedback,
                        EvaluationType = "Writing" // Placeholder
                    });
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving evaluation history.");
                return new EvaluationHistoryResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<EvaluationDetailResponseDto> GetEvaluationDetailAsync(Guid userId, Guid essayEvaluationId)
        {
            try
            {
                var eval = await _dbContext.EssayEvaluations
                    .Include(e => e.WritingPrompt)
                    .Where(e => e.EssayEvaluationId == essayEvaluationId && e.User.UserId == userId)
                    .Select(e => new { e.RawJson, e.WritingPrompt.TaskType, e.WritingPrompt.Topic, e.UserAnswer })
                    .FirstOrDefaultAsync();
                if (eval == null)
                {
                    return new EvaluationDetailResponseDto
                    {
                        Success = false,
                        Message = "Evaluation not found."
                    };
                }
                var feedback = DeserializeFeedback(eval.RawJson);
                return new EvaluationDetailResponseDto
                {
                    Success = true,
                    Message = "Evaluation detail retrieved successfully.",
                    Data = new EvaluationDetailDataDto
                    {
                        TaskType = eval.TaskType ?? string.Empty,
                        Topic = eval.Topic ?? string.Empty,
                        UserAnswer = eval.UserAnswer ?? string.Empty,
                        Feedback = feedback
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving evaluation detail.");
                return new EvaluationDetailResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private IeltsEvaluationResponse? DeserializeFeedback(string rawJson)
        {
            try
            {
                // Try to find the feedback block inside RawJson
                var doc = JsonDocument.Parse(rawJson);
                var candidates = doc.RootElement.GetProperty("candidates");
                var content = candidates[0].GetProperty("content");
                var parts = content.GetProperty("parts");
                var text = parts[0].GetProperty("text").GetString();
                // Remove markdown and trim
                string cleanedJson = text.Trim()
                    .Replace("```json", "")
                    .Replace("```", "")
                    .Trim();
                return JsonSerializer.Deserialize<IeltsEvaluationResponse>(cleanedJson);
            }
            catch
            {
                return null;
            }
        }

        private int GetSafeTokenCount(JsonDocument response, string metadataPath, string tokenPath)
        {
            try
            {
                if (response.RootElement.TryGetProperty(metadataPath, out var metadata) &&
                    metadata.TryGetProperty(tokenPath, out var tokenElement))
                {
                    return tokenElement.GetInt32();
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to extract {TokenPath} from response", tokenPath);
            }
            return 0; // Default value if extraction fails
        }
    }
}
