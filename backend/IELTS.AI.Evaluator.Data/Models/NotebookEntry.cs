namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>One word or phrase a learner keeps for review — typed in by hand, or saved from a
    /// feedback's vocabulary upgrades. Feedback lives in jsonb with no per-item ids, so the text is
    /// copied here rather than referenced; SourceId only links back to the session it came from.</summary>
    public class NotebookEntry : BaseEntity
    {
        public Guid NotebookEntryId { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = default!;
        public string Word { get; set; } = default!;
        public string? Meaning { get; set; }
        public string? Example { get; set; }
        /// <summary>The weaker word this one upgrades; null for manual entries.</summary>
        public string? Replaces { get; set; }
        /// <summary>Approximate CEFR level; only speaking feedback supplies one.</summary>
        public string? Level { get; set; }
        /// <summary>"Manual", "Writing" or "Speaking".</summary>
        public string Source { get; set; } = default!;
        public Guid? SourceId { get; set; }
        public bool Mastered { get; set; }
    }
}
