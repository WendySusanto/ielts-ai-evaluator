namespace IELTS.AI.Evaluator.Data.Models
{
    public class SpeakingSession : BaseEntity
    {
        public Guid SpeakingSessionId { get; set; }
        public Guid UserId { get; set; }
        public Guid SpeakingPromptId { get; set; }
        public User User { get; set; } = default!;
        public SpeakingPrompt SpeakingPrompt { get; set; } = default!;
        public string Part { get; set; } = default!; // "Part1" | "Part2" | "Part3"
        /// <summary>Ordered conversation turns [{role:"examiner"|"candidate",text:string}], jsonb.</summary>
        public string Turns { get; set; } = default!;
        public decimal OverallBand { get; set; }
        /// <summary>Parsed structured Gemini feedback (SpeakingFeedback shape), jsonb.</summary>
        public string Feedback { get; set; } = default!;
        /// <summary>Azure Pronunciation Assessment result, jsonb. Null until Phase 4.</summary>
        public string? Pronunciation { get; set; }
        public string AiModel { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
