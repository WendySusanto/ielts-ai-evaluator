namespace IELTS.AI.Evaluator.Data.Models
{
    public class User : BaseEntity
    {
        public Guid UserId { get; set; }
        public string FirebaseUid { get; set; }

        public string FullName { get; set; } = default!;
        public string Email { get; set; } = default!;

        public string Plan { get; set; } = "Free";

        public decimal IELTSTargetScore { get; set; }
        public DateTimeOffset TargetTestDate { get; set; }

        public DateTimeOffset LastLogin { get; set; }
    }

}
