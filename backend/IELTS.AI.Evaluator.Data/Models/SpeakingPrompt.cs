namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>
    /// Represents an IELTS Speaking cue/topic that a candidate can practice.
    /// Mirrors the structure of <see cref="WritingPrompt"/> but is tailored to
    /// the three parts of the IELTS Speaking test.
    /// </summary>
    public class SpeakingPrompt : BaseEntity
    {
        public Guid SpeakingPromptId { get; set; }

        public string Topic { get; set; } = default!;
        public string Description { get; set; } = default!;
        public string Preview { get; set; } = default!;

        /// <summary>"Part1", "Part2" or "Part3".</summary>
        public string Part { get; set; } = "Part2";

        /// <summary>The main question / cue card text shown to the candidate.</summary>
        public string QuestionText { get; set; } = default!;

        /// <summary>
        /// Optional bullet points the candidate should cover (mainly Part 2 cue cards).
        /// Stored as newline separated text for simplicity.
        /// </summary>
        public string? Cuepoints { get; set; }

        /// <summary>Suggested speaking duration in seconds.</summary>
        public int Duration { get; set; }

        public string Level { get; set; } = "Academic"; // or "General"
    }
}
