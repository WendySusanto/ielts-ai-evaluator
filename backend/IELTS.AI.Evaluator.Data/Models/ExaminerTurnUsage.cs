namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>Gemini usage per examiner turn. Evaluations record their own tokens, but this is the one
    /// paid path with no daily quota — without this table its spend would be invisible.</summary>
    public class ExaminerTurnUsage : BaseEntity
    {
        public Guid ExaminerTurnUsageId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
