namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>An in-flight speaking evaluation keyed by clientSessionId: what the page polls, and what
    /// tells a retry it's still running. Separate so history and quotas only see finished sessions.</summary>
    public class SpeakingEvaluation : BaseEntity
    {
        public Guid SpeakingEvaluationId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
        /// <summary>"processing" | "completed" | "failed".</summary>
        public string Status { get; set; } = default!;
        /// <summary>When the current attempt started; a retry after a failure resets it.</summary>
        public DateTime StartedAt { get; set; }
        /// <summary>What the candidate is told when Status is "failed".</summary>
        public string? Error { get; set; }
    }
}
