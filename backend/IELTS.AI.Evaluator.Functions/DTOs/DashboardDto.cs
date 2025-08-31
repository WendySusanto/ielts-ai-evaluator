using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{
    /// <summary>
    /// Simplified evaluation item for dashboard - excludes feedback details for performance
    /// </summary>
    public class DashboardEvaluationItemDto
    {
        [JsonPropertyName("essayEvaluationId")]
        public Guid EssayEvaluationId { get; set; }

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("overallBand")]
        public decimal OverallBand { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("evaluationType")]
        public string EvaluationType { get; set; } = "Writing";

        // ? No Feedback property - simplified for dashboard performance
    }

    /// <summary>
    /// Response DTO for dashboard evaluation history (top 5 recent, no feedback details)
    /// </summary>
    public class DashboardEvaluationHistoryResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<DashboardEvaluationItemDto> Data { get; set; } = new();

        [JsonPropertyName("totalCount")]
        public int TotalCount => Data.Count;
    }

    /// <summary>
    /// Comprehensive dashboard response with user stats and recent evaluations
    /// </summary>
    public class DashboardDataResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public DashboardDataDto? Data { get; set; }
    }

    /// <summary>
    /// Complete dashboard data including user stats and recent evaluations
    /// </summary>
    public class DashboardDataDto
    {
        [JsonPropertyName("userStats")]
        public DashboardUserStatsDto UserStats { get; set; } = new();

        [JsonPropertyName("recentEvaluations")]
        public List<DashboardEvaluationItemDto> RecentEvaluations { get; set; } = new();

        [JsonPropertyName("quickStats")]
        public DashboardQuickStatsDto QuickStats { get; set; } = new();
    }

    /// <summary>
    /// User statistics for dashboard
    /// </summary>
    public class DashboardUserStatsDto
    {
        [JsonPropertyName("userId")]
        public Guid UserId { get; set; }

        [JsonPropertyName("fullName")]
        public string FullName { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string Email { get; set; } = string.Empty;

        [JsonPropertyName("plan")]
        public string Plan { get; set; } = "Free";

        [JsonPropertyName("ieltsTargetScore")]
        public decimal IeltsTargetScore { get; set; }

        [JsonPropertyName("ieltsTargetType")]
        public string IeltsTargetType { get; set; } = string.Empty;

        [JsonPropertyName("targetTestDate")]
        public DateTimeOffset? TargetTestDate { get; set; }

        [JsonPropertyName("memberSince")]
        public DateTime MemberSince { get; set; }
    }

    /// <summary>
    /// Quick statistics for dashboard overview
    /// </summary>
    public class DashboardQuickStatsDto
    {
        [JsonPropertyName("totalEvaluations")]
        public int TotalEvaluations { get; set; }

        [JsonPropertyName("writingQuotaUsed")]
        public int WritingQuotaUsed { get; set; }

        [JsonPropertyName("speakingQuotaUsed")]
        public int SpeakingQuotaUsed { get; set; }

        [JsonPropertyName("averageBand")]
        public decimal AverageBand { get; set; }

        [JsonPropertyName("lastEvaluationDate")]
        public DateTime? LastEvaluationDate { get; set; }

        [JsonPropertyName("progressToTarget")]
        public decimal ProgressToTarget { get; set; }
    }
}