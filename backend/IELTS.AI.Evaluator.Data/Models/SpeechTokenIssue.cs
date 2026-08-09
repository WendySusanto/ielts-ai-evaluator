namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>One row per Azure Speech token handed to a browser. The token is spendable
    /// directly against the Speech resource, so this is the only record that a given user was
    /// ever in a position to spend — the TTS/STT calls themselves never reach this backend.
    ///
    /// Read it as "who asked for how many", not "who spent how much": a normal session takes
    /// ~4, and RateLimitMiddleware caps SpeechToken_Get at 30/hour, so a user pegged at the cap
    /// is the abuse signal.</summary>
    public class SpeechTokenIssue : BaseEntity
    {
        public Guid SpeechTokenIssueId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
    }
}
