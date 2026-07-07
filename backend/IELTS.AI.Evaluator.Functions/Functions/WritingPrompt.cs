using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 writing prompt endpoints. Thin: no try/catch — the exception middleware
/// maps domain exceptions to their status codes.</summary>
public class WritingPrompt
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly IWritingPromptService _service;

    public WritingPrompt(IWritingPromptService service) => _service = service;

    [Function("WritingPrompt_List")]
    public async Task<IActionResult> ListAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "writing-prompts")] HttpRequest req,
        FunctionContext context)
    {
        var includeInactive = req.Query["includeInactive"] == "true";
        if (includeInactive && !context.IsAdmin())
            throw new ForbiddenException("Administrator access required.");

        var prompts = await _service.ListAsync(includeInactive);
        return new OkObjectResult(prompts);
    }

    [Function("WritingPrompt_Get")]
    public async Task<IActionResult> GetAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "writing-prompts/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        var prompt = await _service.GetAsync(id);
        return new OkObjectResult(prompt);
    }

    [Function("WritingPrompt_Upsert")]
    public async Task<IActionResult> UpsertAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing-prompts")] HttpRequest req,
        FunctionContext context)
    {
        if (!context.IsAdmin())
            throw new ForbiddenException("Administrator access required.");

        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<WritingPromptUpsertRequest>(body, Web)!;
        var prompt = await _service.UpsertAsync(request);
        return new OkObjectResult(prompt);
    }
}
