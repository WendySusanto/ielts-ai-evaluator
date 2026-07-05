namespace IELTS.AI.Evaluator.Data.Models
{
    public class User : BaseEntity
    {
        public Guid UserId { get; set; }
        public string FirebaseUid { get; set; }

        public string FullName { get; set; } = default!;
        public string Email { get; set; } = default!;

        public string AuthProvider { get; set; } = "Email";

        public string Plan { get; set; } = "Free";
        public int WritingQuotaUsed { get; set; }
        public int SpeakingQuotaUsed { get; set; }

        public string IELTSTargetType { get; set; } = "General Training";
        public decimal IELTSTargetScore { get; set; }
        public DateTimeOffset TargetTestDate { get; set; }

        public DateTimeOffset LastLogin { get; set; }

        public ICollection<EssayEvaluation> Essays { get; set; } = new List<EssayEvaluation>();
        public ICollection<SpeakingEvaluation> SpeakingEvaluations { get; set; } = new List<SpeakingEvaluation>();
    }

}
