namespace IELTS.AI.Evaluator.Data.Models
{
    public class WritingEvaluation : BaseEntity
    {
        public Guid WritingEvaluationId { get; set; }
        public Guid UserId { get; set; }
        public Guid WritingPromptId { get; set; }
        public User User { get; set; } = default!;
        public WritingPrompt WritingPrompt { get; set; } = default!;
        public string EssayText { get; set; } = default!;
        public int WordCount { get; set; }
        public decimal OverallBand { get; set; }
        /// <summary>Parsed structured Gemini feedback (WritingFeedback shape), stored as jsonb.</summary>
        public string Feedback { get; set; } = default!;
        public string AiModel { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
