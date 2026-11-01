namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>An IELTS Speaking cue/topic — the speaking counterpart of <see cref="WritingPrompt"/>.</summary>
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

        /// <summary>Part 2 cue card bullets, or Part 1/3's scripted questions; one per line.</summary>
        public string? Cuepoints { get; set; }

        /// <summary>Suggested speaking duration in seconds.</summary>
        public int Duration { get; set; }

        public string Level { get; set; } = "Academic"; // or "General"
        public bool IsActive { get; set; } = true;
    }
}
