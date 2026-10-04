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
        /// <summary>Where each answer's recording is kept for playback: [{answer, blobName}], jsonb.
        /// Null when nothing was recorded, storage is not configured, or every upload failed.</summary>
        public string? AudioClips { get; set; }
        /// <summary>Which feedback schema produced Feedback: 1 for every session marked before
        /// versioning (the migration backfills it), 2 from the schema with answers, errors and
        /// nextBand, 3 adds the transcript taken from each recording and pronunciation notes. Lets old
        /// sessions be told apart without sniffing their JSON.</summary>
        public int FeedbackVersion { get; set; } = 1;
        public string AiModel { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
