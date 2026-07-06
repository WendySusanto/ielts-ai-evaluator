using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading;

namespace IELTS.AI.Evaluator.Functions.Functions
{
    public class WritingPrompt
    {
        private readonly ILogger<WritingPrompt> _logger;
        private readonly IWritingPromptService _writingPromptService;

        public WritingPrompt(
            ILogger<WritingPrompt> logger,
            IWritingPromptService writingPromptService)
        {
            _logger = logger;
            _writingPromptService = writingPromptService;
        }

        [Function("UpsertWritingPrompt")]
        public async Task<IActionResult> UpsertWritingPromptAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing-prompt")] HttpRequest req,
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
                var payload = JsonSerializer.Deserialize<WritingPromptUpsertRequestDto>(requestBody);
                var result = await _writingPromptService.UpsertWritingPromptAsync(payload);

                if (!result.Success)
                {
                    if (result.Message == "Invalid request payload." || result.Message == "Writing prompt not found.")
                        return new BadRequestObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpsertWritingPrompt function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetWritingPrompt")]
        public async Task<IActionResult> GetWritingPromptAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "writing-prompt")] HttpRequest req, FunctionContext executionContext)
        {
            try
            {
                if (executionContext.GetUserId() == null)
                {
                    return new StatusCodeResult(StatusCodes.Status401Unauthorized);
                }

                var idParam = req.Query["id"].ToString();
                
                if (string.IsNullOrEmpty(idParam))
                {
                    // If no ID is provided, return all writing prompts
                    var listResult = await _writingPromptService.GetWritingPromptsAsync();
                    if (!listResult.Success)
                    {
                        return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                    }
                    return new OkObjectResult(listResult);
                }

                // If ID is provided, return specific writing prompt
                if (!Guid.TryParse(idParam, out Guid writingPromptId))
                {
                    return new BadRequestObjectResult(new WritingPromptResponseDto
                    {
                        Success = false,
                        Message = "Invalid writing prompt ID format."
                    });
                }

                var result = await _writingPromptService.GetWritingPromptAsync(writingPromptId);
                if (!result.Success)
                {
                    if (result.Message == "Writing prompt not found.")
                        return new NotFoundObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetWritingPrompt function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}
