namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>
    /// Stores the result of an AI evaluation of a candidate's spoken response.
    /// The candidate's speech is transcribed on the client and the transcript is
    /// what gets evaluated, mirroring how <see cref="EssayEvaluation"/> stores the
    /// written answer.
    /// </summary>
    public class SpeakingEvaluation : BaseEntity
    {
        public Guid SpeakingEvaluationId { get; set; }
        public decimal OverallBand { get; set; }

        /// <summary>Raw Gemini API response (for auditing / re-parsing).</summary>
        public string RawJson { get; set; } = default!;

        /// <summary>The transcribed answer the candidate spoke.</summary>
        public string Transcript { get; set; } = default!;

        public User User { get; set; } = default!;
        public SpeakingPrompt SpeakingPrompt { get; set; } = default!;

        // Gemini AI response metadata
        public string AiModel { get; set; } = default!;
        public int PromptTokenCount { get; set; }
        public int CandidatesTokenCount { get; set; }
    }
}
