using System.Text.Json;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 speaking evaluation endpoints. Thin: no try/catch — the exception middleware
/// maps domain exceptions to their status codes.</summary>
public class SpeakingV2
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly ISpeakingService _speakingService;
    private readonly IExaminerService _examinerService;

    public SpeakingV2(ISpeakingService speakingService, IExaminerService examinerService)
    {
        _speakingService = speakingService;
        _examinerService = examinerService;
    }

    [Function("SpeakingV2_Evaluate")]
    public async Task<IActionResult> EvaluateAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "v2/speaking/sessions")] HttpRequest req,
        FunctionContext context)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<SpeakingEvaluateRequest>(body, Web)!;
        var dto = await _speakingService.EvaluateAsync(context.GetUserId()!.Value, context.GetUserRole()!, request);
        return new OkObjectResult(dto);
    }

    [Function("SpeakingV2_GetHistory")]
    public async Task<IActionResult> GetHistoryAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "v2/speaking/sessions")] HttpRequest req,
        FunctionContext context)
    {
        var history = await _speakingService.GetHistoryAsync(context.GetUserId()!.Value);
        return new OkObjectResult(history);
    }

    [Function("SpeakingV2_GetDetail")]
    public async Task<IActionResult> GetDetailAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "v2/speaking/sessions/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        var detail = await _speakingService.GetDetailAsync(context.GetUserId()!.Value, id);
        return new OkObjectResult(detail);
    }

    [Function("SpeakingV2_ExaminerTurn")]
    public async Task<IActionResult> ExaminerTurnAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "speaking/examiner-turn")] HttpRequest req,
        FunctionContext context)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<ExaminerTurnRequest>(body, Web)!;
        var result = await _examinerService.NextTurnAsync(context.GetUserId()!.Value, request);
        return new OkObjectResult(result);
    }
}
