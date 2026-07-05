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
        public async Task<IActionResult> EvaluateEssayAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing/evaluate")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                var userId = context.GetUserId();
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new EssayEvaluationResponseDto
                    { Success = false, Message = "User not authenticated" });
                }

                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<EssayEvaluationRequestDto>(requestBody);
                var result = await _essayEvaluationService.EvaluateEssayAsync(userId.Value, payload);

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
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "evaluation-history")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                var userId = context.GetUserId();
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new EvaluationHistoryResponseDto
                    {
                        Success = false,
                        Message = "User not authenticated"
                    });
                }
                var result = await _essayEvaluationService.GetEvaluationHistoryAsync(userId.Value);
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
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "evaluation-detail")] HttpRequest req,
            FunctionContext context)
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

                var userId = context.GetUserId();
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new EvaluationDetailResponseDto
                    {
                        Success = false,
                        Message = "User not authenticated"
                    });
                }
                var result = await _essayEvaluationService.GetEvaluationDetailAsync(userId.Value, evalId);
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
