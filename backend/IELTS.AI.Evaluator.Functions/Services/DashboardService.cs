using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IDashboardService
    {
        Task<DashboardEvaluationHistoryResponseDto> GetRecentEvaluationHistoryAsync(Guid userId);
        Task<DashboardDataResponseDto> GetDashboardDataAsync(Guid userId);
    }

    public class DashboardService : IDashboardService
    {
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<DashboardService> _logger;

        public DashboardService(
            EvaluatorDbContext dbContext,
            ILogger<DashboardService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<DashboardEvaluationHistoryResponseDto> GetRecentEvaluationHistoryAsync(Guid userId)
        {
            try
            {
                // Get only top 5 recent evaluations without feedback details
                var evaluations = await _dbContext.EssayEvaluations
                    .Include(e => e.WritingPrompt)
                    .Where(e => e.User.UserId == userId && !e.IsDeleted)
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(5) // ? Only top 5 recent evaluations
                    .Select(e => new DashboardEvaluationItemDto
                    {
                        EssayEvaluationId = e.EssayEvaluationId,
                        TaskType = e.WritingPrompt != null ? e.WritingPrompt.TaskType : string.Empty,
                        Topic = e.WritingPrompt != null ? e.WritingPrompt.Topic : string.Empty,
                        OverallBand = e.OverallBand,
                        CreatedAt = e.CreatedAt,
                        EvaluationType = "Writing"
                        // ? No Feedback property - simplified for dashboard
                    })
                    .ToListAsync();

                return new DashboardEvaluationHistoryResponseDto
                {
                    Success = true,
                    Message = "Recent evaluation history retrieved successfully.",
                    Data = evaluations
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving recent evaluation history for user {UserId}", userId);
                return new DashboardEvaluationHistoryResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<DashboardDataResponseDto> GetDashboardDataAsync(Guid userId)
        {
            try
            {
                // Get user data
                var user = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted);

                if (user == null)
                {
                    return new DashboardDataResponseDto
                    {
                        Success = false,
                        Message = "User not found."
                    };
                }

                // Get recent evaluations (top 5, no feedback)
                var recentEvaluations = await _dbContext.EssayEvaluations
                    .Include(e => e.WritingPrompt)
                    .Where(e => e.User.UserId == userId && !e.IsDeleted)
                    .OrderByDescending(e => e.CreatedAt)
                    .Take(5)
                    .Select(e => new DashboardEvaluationItemDto
                    {
                        EssayEvaluationId = e.EssayEvaluationId,
                        TaskType = e.WritingPrompt != null ? e.WritingPrompt.TaskType : string.Empty,
                        Topic = e.WritingPrompt != null ? e.WritingPrompt.Topic : string.Empty,
                        OverallBand = e.OverallBand,
                        CreatedAt = e.CreatedAt,
                        EvaluationType = "Writing"
                    })
                    .ToListAsync();

                // Calculate quick stats
                var allEvaluations = await _dbContext.EssayEvaluations
                    .Where(e => e.User.UserId == userId && !e.IsDeleted)
                    .Select(e => new { e.OverallBand, e.CreatedAt })
                    .ToListAsync();

                var quickStats = new DashboardQuickStatsDto
                {
                    TotalEvaluations = allEvaluations.Count,
                    WritingQuotaUsed = user.WritingQuotaUsed,
                    SpeakingQuotaUsed = user.SpeakingQuotaUsed,
                    AverageBand = allEvaluations.Count > 0 ? allEvaluations.Average(e => e.OverallBand) : 0,
                    LastEvaluationDate = allEvaluations.Count > 0 ? allEvaluations.Max(e => e.CreatedAt) : null,
                    ProgressToTarget = CalculateProgressToTarget(allEvaluations.Count > 0 ? allEvaluations.Average(e => e.OverallBand) : 0, user.IELTSTargetScore)
                };

                var userStats = new DashboardUserStatsDto
                {
                    UserId = user.UserId,
                    FullName = user.FullName,
                    Email = user.Email,
                    Plan = user.Plan,
                    IeltsTargetScore = user.IELTSTargetScore,
                    IeltsTargetType = user.IELTSTargetType,
                    TargetTestDate = user.TargetTestDate,
                    MemberSince = user.CreatedAt
                };

                var dashboardData = new DashboardDataDto
                {
                    UserStats = userStats,
                    RecentEvaluations = recentEvaluations,
                    QuickStats = quickStats
                };

                return new DashboardDataResponseDto
                {
                    Success = true,
                    Message = "Dashboard data retrieved successfully.",
                    Data = dashboardData
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving dashboard data for user {UserId}", userId);
                return new DashboardDataResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private static decimal CalculateProgressToTarget(decimal currentAverage, decimal targetScore)
        {
            if (targetScore <= 0) return 0;
            if (currentAverage >= targetScore) return 100;
            
            // Calculate percentage of progress towards target
            var progress = (currentAverage / targetScore) * 100;
            return Math.Round(progress, 1);
        }
    }
}