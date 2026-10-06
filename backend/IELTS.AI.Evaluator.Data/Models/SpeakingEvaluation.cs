namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>A submitted speaking evaluation while Gemini works on it, keyed by the browser's
    /// clientSessionId — the id the finished SpeakingSession is saved under. It is what the practice
    /// page polls instead of holding one long request open, and what tells a retry that the first
    /// attempt is still running. Kept apart from SpeakingSessions so history, dashboards and quotas
    /// only ever see finished sessions.</summary>
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
