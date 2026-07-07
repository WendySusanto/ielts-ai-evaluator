using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 writing evaluation endpoints. Thin: no try/catch — the exception middleware
/// maps domain exceptions to their status codes.</summary>
public class WritingV2
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly IWritingService _writingService;

    public WritingV2(IWritingService writingService) => _writingService = writingService;

    [Function("WritingV2_Evaluate")]
    public async Task<IActionResult> EvaluateAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "v2/writing/evaluations")] HttpRequest req,
        FunctionContext context)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<WritingEvaluateRequest>(body, Web)!;
        var dto = await _writingService.EvaluateAsync(context.GetUserId()!.Value, context.GetUserRole()!, request);
        return new OkObjectResult(dto);
    }

    [Function("WritingV2_GetHistory")]
    public async Task<IActionResult> GetHistoryAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "v2/writing/evaluations")] HttpRequest req,
        FunctionContext context)
    {
        var history = await _writingService.GetHistoryAsync(context.GetUserId()!.Value);
        return new OkObjectResult(history);
    }

    [Function("WritingV2_GetDetail")]
    public async Task<IActionResult> GetDetailAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "v2/writing/evaluations/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        var detail = await _writingService.GetDetailAsync(context.GetUserId()!.Value, id);
        return new OkObjectResult(detail);
    }
}
