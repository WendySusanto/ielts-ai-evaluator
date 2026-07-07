using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 dashboard endpoints. Thin: no try/catch — the exception middleware maps
/// domain exceptions to their status codes.</summary>
public class Dashboard
{
    private const int AdminRecentDefault = 10;

    private readonly IDashboardService _service;

    public Dashboard(IDashboardService service) => _service = service;

    [Function("Dashboard_Get")]
    public async Task<IActionResult> GetDashboardAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dashboard")] HttpRequest req,
        FunctionContext context)
    {
        var dashboard = await _service.GetDashboardAsync(context.GetUserId()!.Value);
        return new OkObjectResult(dashboard);
    }

    [Function("Admin_RecentEvaluations")]
    public async Task<IActionResult> AdminRecentEvaluationsAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/recent-evaluations")] HttpRequest req,
        FunctionContext context)
    {
        if (!context.IsAdmin())
            throw new ForbiddenException("Administrator access required.");

        var userIdParam = req.Query["userId"].ToString();
        Guid targetUserId;
        if (string.IsNullOrEmpty(userIdParam))
            targetUserId = context.GetUserId()!.Value;
        else if (!Guid.TryParse(userIdParam, out targetUserId))
            throw new ValidationException("Invalid userId format.");

        var items = await _service.GetRecentAsync(targetUserId, AdminRecentDefault);
        return new OkObjectResult(items);
    }
}
