namespace IELTS.AI.Evaluator.Data.Models
{
    public class User : BaseEntity
    {
        public string Email { get; set; } = default!;
        public string AuthProvider { get; set; } = "Email"; // Email, Google,
        public string Plan { get; set; } = "Free";
        public int WritingQuotaUsed { get; set; }
        public int SpeakingQuotaUsed { get; set; }

        public string IELTSTargetType { get; set; } = "General Training";
        public decimal IELTSTargetScore {  get; set; }
        public DateTime TargetTestDate { get; set; }

        public ICollection<Essay> Essays { get; set; } = new List<Essay>();
    }

}
