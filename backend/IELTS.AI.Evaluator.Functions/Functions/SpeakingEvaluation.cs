using System.Text.Json;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Functions
{
    public class SpeakingEvaluation
    {
        private readonly ILogger<SpeakingEvaluation> _logger;
        private readonly ISpeakingEvaluationService _speakingEvaluationService;

        public SpeakingEvaluation(
            ILogger<SpeakingEvaluation> logger,
            ISpeakingEvaluationService speakingEvaluationService)
        {
            _logger = logger;
            _speakingEvaluationService = speakingEvaluationService;
        }

        [Function("EvaluateSpeaking")]
        public async Task<IActionResult> EvaluateSpeakingAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "speaking/evaluate")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                var userId = context.GetUserId();
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new SpeakingEvaluationResponseDto
                    {
                        Success = false,
                        Message = "User not authenticated"
                    });
                }

                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<SpeakingEvaluationRequestDto>(requestBody);
                var result = await _speakingEvaluationService.EvaluateSpeakingAsync(userId.Value, payload);

                if (!result.Success)
                {
                    if (result.Message == "Invalid request payload." ||
                        result.Message == "User or SpeakingPrompt not found." ||
                        result.Message == "Invalid JSON format.")
                        return new BadRequestObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in EvaluateSpeaking function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetSpeakingHistory")]
        public async Task<IActionResult> GetSpeakingHistoryAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "speaking-history")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                var userId = context.GetUserId();
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new SpeakingHistoryResponseDto
                    {
                        Success = false,
                        Message = "User not authenticated"
                    });
                }

                var result = await _speakingEvaluationService.GetSpeakingHistoryAsync(userId.Value);
                if (!result.Success)
                {
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSpeakingHistory function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetSpeakingDetail")]
        public async Task<IActionResult> GetSpeakingDetailAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "speaking-detail")] HttpRequest req)
        {
            try
            {
                var idParam = req.Query["id"].ToString();
                if (!Guid.TryParse(idParam, out Guid evalId))
                {
                    return new BadRequestObjectResult(new SpeakingDetailResponseDto
                    {
                        Success = false,
                        Message = "Invalid evaluation id format."
                    });
                }

                var result = await _speakingEvaluationService.GetSpeakingDetailAsync(evalId);
                if (!result.Success)
                {
                    if (result.Message == "Evaluation not found.")
                        return new NotFoundObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSpeakingDetail function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
