using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using IELTS.AI.Evaluator.Functions.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Functions
{
    public class Dashboard
    {
        private readonly ILogger<Dashboard> _logger;
        private readonly IDashboardService _dashboardService;

        public Dashboard(
            ILogger<Dashboard> logger,
            IDashboardService dashboardService)
        {
            _logger = logger;
            _dashboardService = dashboardService;
        }

        /// <summary>
        /// Get comprehensive dashboard data including user stats and recent evaluations
        /// Route: /api/dashboard
        /// </summary>
        [Function("GetDashboardData")]
        public async Task<IActionResult> GetDashboardDataAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dashboard")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                // Get current user ID from middleware context
                var userId = context.GetUserId();
                
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new { 
                        success = false, 
                        message = "User not authenticated" 
                    });
                }

                var result = await _dashboardService.GetDashboardDataAsync(userId.Value);

                if (!result.Success)
                {
                    if (result.Message == "User not found.")
                        return new NotFoundObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetDashboardData function");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Get recent evaluation history for dashboard (top 5, no feedback details)
        /// Route: /api/dashboard/recent-evaluations
        /// </summary>
        [Function("GetRecentEvaluations")]
        public async Task<IActionResult> GetRecentEvaluationsAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dashboard/recent-evaluations")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                // Get current user ID from middleware context
                var userId = context.GetUserId();
                
                if (userId == null)
                {
                    return new UnauthorizedObjectResult(new { 
                        success = false, 
                        message = "User not authenticated" 
                    });
                }

                var result = await _dashboardService.GetRecentEvaluationHistoryAsync(userId.Value);

                if (!result.Success)
                {
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRecentEvaluations function");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        /// <summary>
        /// Get recent evaluation history with optional user ID parameter (for admin use)
        /// Route: /api/dashboard/admin/recent-evaluations
        /// </summary>
        [Function("GetRecentEvaluationsAdmin")]
        public async Task<IActionResult> GetRecentEvaluationsAdminAsync(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "dashboard/admin/recent-evaluations")] HttpRequest req,
            FunctionContext context)
        {
            try
            {
                // Check if user is admin
                if (!context.IsAdmin())
                {
                    return new ObjectResult(new { message = "Administrator access required" })
                    {
                        StatusCode = StatusCodes.Status403Forbidden
                    };
                }

                var userIdParam = req.Query["userId"].ToString();
                Guid targetUserId;

                if (string.IsNullOrEmpty(userIdParam))
                {
                    // If no userId provided, use current user
                    var currentUserId = context.GetUserId();
                    if (currentUserId == null)
                    {
                        return new UnauthorizedObjectResult(new { 
                            success = false, 
                            message = "User not authenticated" 
                        });
                    }
                    targetUserId = currentUserId.Value;
                }
                else
                {
                    // Use provided userId (admin can view any user's data)
                    if (!Guid.TryParse(userIdParam, out targetUserId))
                    {
                        return new BadRequestObjectResult(new { 
                            success = false, 
                            message = "Invalid userId format" 
                        });
                    }
                }

                var result = await _dashboardService.GetRecentEvaluationHistoryAsync(targetUserId);

                if (!result.Success)
                {
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetRecentEvaluationsAdmin function");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}