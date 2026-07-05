using System.Security.Claims;
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
    public class SpeakingPrompt
    {
        private readonly ILogger<SpeakingPrompt> _logger;
        private readonly ISpeakingPromptService _speakingPromptService;

        public SpeakingPrompt(
            ILogger<SpeakingPrompt> logger,
            ISpeakingPromptService speakingPromptService)
        {
            _logger = logger;
            _speakingPromptService = speakingPromptService;
        }

        [Function("UpsertSpeakingPrompt")]
        public async Task<IActionResult> UpsertSpeakingPromptAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "speaking-prompt")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                if (!context.IsAdmin())
                {
                    return new ObjectResult(new { success = false, message = "Administrator access required." })
                    { StatusCode = StatusCodes.Status403Forbidden };
                }

                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<SpeakingPromptUpsertRequestDto>(requestBody);
                var result = await _speakingPromptService.UpsertSpeakingPromptAsync(payload);

                if (!result.Success)
                {
                    if (result.Message == "Invalid request payload." || result.Message == "Speaking prompt not found.")
                        return new BadRequestObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpsertSpeakingPrompt function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetSpeakingPrompt")]
        public async Task<IActionResult> GetSpeakingPromptAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "speaking-prompt")] HttpRequest req,
            FunctionContext executionContext)
        {
            try
            {
                var user = executionContext.Items.TryGetValue("User", out var u) ? u as ClaimsPrincipal : null;

                if (user == null)
                {
                    return new StatusCodeResult(StatusCodes.Status401Unauthorized);
                }

                var idParam = req.Query["id"].ToString();

                if (string.IsNullOrEmpty(idParam))
                {
                    var listResult = await _speakingPromptService.GetSpeakingPromptsAsync();
                    if (!listResult.Success)
                    {
                        return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                    }
                    return new OkObjectResult(listResult);
                }

                if (!Guid.TryParse(idParam, out Guid speakingPromptId))
                {
                    return new BadRequestObjectResult(new SpeakingPromptResponseDto
                    {
                        Success = false,
                        Message = "Invalid speaking prompt ID format."
                    });
                }

                var result = await _speakingPromptService.GetSpeakingPromptAsync(speakingPromptId);
                if (!result.Success)
                {
                    if (result.Message == "Speaking prompt not found.")
                        return new NotFoundObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetSpeakingPrompt function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
