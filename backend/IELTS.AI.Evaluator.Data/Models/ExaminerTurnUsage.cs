namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>Gemini usage for one live examiner turn. Evaluations already carry their own
    /// PromptTokens/CompletionTokens on SpeakingSession and WritingEvaluation, but examiner turns
    /// produce no such row — and they are the one paid path with no daily quota in front of it,
    /// so without this table the most abusable Gemini spend is the only spend nobody can see.</summary>
    public class ExaminerTurnUsage : BaseEntity
    {
        public Guid ExaminerTurnUsageId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
