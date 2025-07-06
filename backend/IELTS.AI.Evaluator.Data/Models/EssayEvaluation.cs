using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IELTS.AI.Evaluator.Data.Models
{
    public class EssayEvaluation : BaseEntity
    {
        public decimal OverallBand { get; set; }

        public decimal TaskResponseBand { get; set; }
        public decimal CoherenceCohesionBand { get; set; }
        public decimal LexicalResourceBand { get; set; }
        public decimal GrammaticalRangeAccuracyBand { get; set; }

        public string? TaskResponseGeneralFeedback { get; set; }
        public string? CoherenceCohesionGeneralFeedback { get; set; }
        public string? LexicalResourceGeneralFeedback { get; set; }
        public string? GrammaticalRangeAccuracyGeneralFeedback { get; set; }

        public string RawJson { get; set; } = default!;

        public Guid EssayId { get; set; }
        public Essay Essay { get; set; } = default!;
    }

}
