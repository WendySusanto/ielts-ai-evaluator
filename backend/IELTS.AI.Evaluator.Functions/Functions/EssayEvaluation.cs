using System.Text.Json;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Functions
{
    public class EssayEvaluation
    {
        private readonly ILogger<EssayEvaluation> _logger;
        private readonly IEssayEvaluationService _essayEvaluationService;

        public EssayEvaluation(
            ILogger<EssayEvaluation> logger,
            IEssayEvaluationService essayEvaluationService)
        {
            _logger = logger;
            _essayEvaluationService = essayEvaluationService;
        }

        [Function("EvaluateEssay")]
        public async Task<IActionResult> EvaluateEssayAsync([HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing/evaluate")] HttpRequest req)
        {
            try
            {
                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<EssayEvaluationRequestDto>(requestBody);
                var result = await _essayEvaluationService.EvaluateEssayAsync(payload);

                if (!result.Success)
                {
                    if (result.Message == "Invalid request payload." || result.Message == "User or WritingPrompt not found." || result.Message == "Invalid JSON format.")
                        return new BadRequestObjectResult(result);
                    if (result.Message == "Gemini API key is missing.")
                        return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in EssayEvaluation function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetEvaluationHistory")]
        public async Task<IActionResult> GetEvaluationHistoryAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "evaluation-history")] HttpRequest req)
        {
            try
            {
                var userIdParam = req.Query["userId"].ToString();
                if (!Guid.TryParse(userIdParam, out Guid userId))
                {
                    return new BadRequestObjectResult(new EvaluationHistoryResponseDto
                    {
                        Success = false,
                        Message = "Invalid userId format."
                    });
                }
                var result = await _essayEvaluationService.GetEvaluationHistoryAsync(userId);
                if (!result.Success)
                {
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetEvaluationHistory function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetEvaluationDetail")]
        public async Task<IActionResult> GetEvaluationDetailAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "evaluation-detail")] HttpRequest req)
        {
            try
            {
                var evalIdParam = req.Query["id"].ToString();
                if (!Guid.TryParse(evalIdParam, out Guid evalId))
                {
                    return new BadRequestObjectResult(new EvaluationDetailResponseDto
                    {
                        Success = false,
                        Message = "Invalid evaluation id format."
                    });
                }
                var result = await _essayEvaluationService.GetEvaluationDetailAsync(evalId);
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
                _logger.LogError(ex, "Error in GetEvaluationDetail function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
