using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IELTS.AI.Evaluator.Data.Models
{
    public class EssayEvaluation : BaseEntity
    {
        public Guid EssayEvaluationId { get; set; }
        public decimal OverallBand { get; set; }
        public string RawJson { get; set; } = default!;
        public string UserAnswer { get; set; } = default!;
        public User User { get; set; } = default!;
        public WritingPrompt WritingPrompt { get; set; } = default!;

        //Gemini AI Response
        public string AiModel { get; set; } = default!;
        public int PromptTokenCount { get; set; }
        public int CandidatesTokenCount {  get; set; }
    }
}

