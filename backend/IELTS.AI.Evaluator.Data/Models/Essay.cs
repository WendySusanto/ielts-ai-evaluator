using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IELTS.AI.Evaluator.Data.Models
{
    public class Essay : BaseEntity
    {
        public string QuestionText { get; set; } = default!;
        public string Level { get; set; } = "Academic"; // or "General"
        public string UserAnswer { get; set; } = default!;

        public Guid UserId { get; set; }
        public User User { get; set; } = default!;

        public EssayEvaluation? Evaluation { get; set; }
    }

}
