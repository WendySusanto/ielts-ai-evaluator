using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace IELTS.AI.Evaluator.Data.Models
{
    public class WritingPrompt : BaseEntity
    {
        public string Topic { get; set; } = default!;
        public string QuestionType { get; set; } = default!;
        public string QuestionText { get; set; } = default!;
        public string TaskType { get; set; } = "Task2"; // Or "Task1"
        public string Level { get; set; } = "Academic"; // or "General"
        public string? ImageUrl { get; set; } // For Task 1 prompts that require an image
    }

}
