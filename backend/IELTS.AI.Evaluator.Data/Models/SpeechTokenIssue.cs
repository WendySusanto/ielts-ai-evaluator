namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>One row per Azure Speech token issued — the only trace, since TTS/STT bypass this backend.
    /// Counts requests, not spend: ~4 per session, so a user at the 30/hour cap is the abuse signal.</summary>
    public class SpeechTokenIssue : BaseEntity
    {
        public Guid SpeechTokenIssueId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
    }
}
