using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface ISpeakingEvaluationService
    {
        Task<SpeakingEvaluationResponseDto> EvaluateSpeakingAsync(Guid userId, SpeakingEvaluationRequestDto payload);
        Task<SpeakingHistoryResponseDto> GetSpeakingHistoryAsync(Guid userId);
        Task<SpeakingDetailResponseDto> GetSpeakingDetailAsync(Guid userId, Guid speakingEvaluationId);
    }

    public class SpeakingEvaluationService : ISpeakingEvaluationService
    {
        private readonly IGeminiApiClient _geminiApiClient;
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<SpeakingEvaluationService> _logger;
        private readonly IConfiguration _configuration;

        public SpeakingEvaluationService(
            IGeminiApiClient geminiApiClient,
            EvaluatorDbContext dbContext,
            ILogger<SpeakingEvaluationService> logger,
            IConfiguration configuration)
        {
            _geminiApiClient = geminiApiClient;
            _dbContext = dbContext;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<SpeakingEvaluationResponseDto> EvaluateSpeakingAsync(Guid userId, SpeakingEvaluationRequestDto payload)
        {
            if (payload == null || string.IsNullOrWhiteSpace(payload.Transcript) || payload.SpeakingPromptId == Guid.Empty)
            {
                return new SpeakingEvaluationResponseDto
                {
                    Success = false,
                    Message = "Invalid request payload."
                };
            }

            var geminiApiKey = _configuration["GeminiApiKey"];
            if (string.IsNullOrWhiteSpace(geminiApiKey))
            {
                _logger.LogError("Gemini API key is missing.");
                return new SpeakingEvaluationResponseDto
                {
                    Success = false,
                    Message = "Gemini API key is missing."
                };
            }

            try
            {
                var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId);
                var speakingPrompt = await _dbContext.SpeakingPrompts
                    .FirstOrDefaultAsync(p => p.SpeakingPromptId == payload.SpeakingPromptId);

                if (user == null || speakingPrompt == null)
                {
                    return new SpeakingEvaluationResponseDto
                    {
                        Success = false,
                        Message = "User or SpeakingPrompt not found."
                    };
                }

                var aiResponseJson = await _geminiApiClient.EvaluateSpeakingAsync(
                    payload.Transcript,
                    payload.Question,
                    payload.Cuepoints,
                    payload.Part,
                    geminiApiKey);

                _logger.LogInformation("Speaking evaluation AI response received.");

                var aiResponse = JsonDocument.Parse(aiResponseJson);
                var overallBand = ExtractOverallBand(aiResponse);
                var aiModel = aiResponse.RootElement.TryGetProperty("modelVersion", out var modelEl)
                    ? modelEl.GetString() : string.Empty;
                var promptTokenCount = GetSafeTokenCount(aiResponse, "usageMetadata", "promptTokenCount");
                var candidatesTokenCount = GetSafeTokenCount(aiResponse, "usageMetadata", "candidatesTokenCount");

                var speakingEvaluationId = Guid.NewGuid();
                var speakingEvaluation = new SpeakingEvaluation
                {
                    SpeakingEvaluationId = speakingEvaluationId,
                    OverallBand = overallBand,
                    RawJson = aiResponseJson,
                    Transcript = payload.Transcript,
                    User = user,
                    SpeakingPrompt = speakingPrompt,
                    AiModel = aiModel ?? string.Empty,
                    PromptTokenCount = promptTokenCount,
                    CandidatesTokenCount = candidatesTokenCount
                };

                user.SpeakingQuotaUsed += 1;

                _dbContext.SpeakingEvaluations.Add(speakingEvaluation);
                await _dbContext.SaveChangesAsync();

                return new SpeakingEvaluationResponseDto
                {
                    Success = true,
                    Message = "Evaluation successful.",
                    Data = new SpeakingEvaluationDataDto
                    {
                        SpeakingEvaluationId = speakingEvaluationId,
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
                return new SpeakingEvaluationResponseDto
                {
                    Success = false,
                    Message = "Invalid JSON format."
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing speaking evaluation.");
                return new SpeakingEvaluationResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<SpeakingHistoryResponseDto> GetSpeakingHistoryAsync(Guid userId)
        {
            try
            {
                var evaluations = await _dbContext.SpeakingEvaluations
                    .Include(e => e.SpeakingPrompt)
                    .Where(e => e.User.UserId == userId && !e.IsDeleted)
                    .OrderByDescending(e => e.CreatedAt)
                    .ToListAsync();

                var result = new SpeakingHistoryResponseDto { Success = true };
                foreach (var eval in evaluations)
                {
                    result.Data.Add(new SpeakingHistoryItemDto
                    {
                        SpeakingEvaluationId = eval.SpeakingEvaluationId,
                        Part = eval.SpeakingPrompt?.Part ?? string.Empty,
                        Topic = eval.SpeakingPrompt?.Topic ?? string.Empty,
                        OverallBand = eval.OverallBand,
                        CreatedAt = eval.CreatedAt,
                        Feedback = DeserializeFeedback(eval.RawJson),
                        EvaluationType = "Speaking"
                    });
                }
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving speaking history.");
                return new SpeakingHistoryResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<SpeakingDetailResponseDto> GetSpeakingDetailAsync(Guid userId, Guid speakingEvaluationId)
        {
            try
            {
                var eval = await _dbContext.SpeakingEvaluations
                    .Include(e => e.SpeakingPrompt)
                    .Where(e => e.SpeakingEvaluationId == speakingEvaluationId && e.User.UserId == userId)
                    .Select(e => new { e.RawJson, e.SpeakingPrompt.Part, e.SpeakingPrompt.Topic, e.Transcript })
                    .FirstOrDefaultAsync();

                if (eval == null)
                {
                    return new SpeakingDetailResponseDto
                    {
                        Success = false,
                        Message = "Evaluation not found."
                    };
                }

                return new SpeakingDetailResponseDto
                {
                    Success = true,
                    Message = "Evaluation detail retrieved successfully.",
                    Data = new SpeakingDetailDataDto
                    {
                        Part = eval.Part ?? string.Empty,
                        Topic = eval.Topic ?? string.Empty,
                        Transcript = eval.Transcript ?? string.Empty,
                        Feedback = DeserializeFeedback(eval.RawJson)
                    }
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving speaking evaluation detail.");
                return new SpeakingDetailResponseDto
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
                var text = ExtractModelText(aiResponse);
                var blockDoc = JsonDocument.Parse(text);
                return blockDoc.RootElement.GetProperty("overallBand").GetDecimal();
            }
            catch
            {
                return 0;
            }
        }

        private SpeakingEvaluationResponse? DeserializeFeedback(string rawJson)
        {
            try
            {
                var doc = JsonDocument.Parse(rawJson);
                var text = ExtractModelText(doc);
                return JsonSerializer.Deserialize<SpeakingEvaluationResponse>(text);
            }
            catch
            {
                return null;
            }
        }

        private static string ExtractModelText(JsonDocument aiResponse)
        {
            var candidates = aiResponse.RootElement.GetProperty("candidates");
            var content = candidates[0].GetProperty("content");
            var parts = content.GetProperty("parts");
            var text = parts[0].GetProperty("text").GetString() ?? string.Empty;

            return text.Trim()
                .Replace("```json", string.Empty)
                .Replace("```", string.Empty)
                .Trim();
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
            return 0;
        }
    }
}
