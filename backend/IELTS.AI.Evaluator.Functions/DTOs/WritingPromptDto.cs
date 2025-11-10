using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{
    public class WritingPromptUpsertRequestDto
    {
        [JsonPropertyName("writingPromptId")]
        public Guid? WritingPromptId { get; set; }
        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;
        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;
        [JsonPropertyName("preview")]
        public string Preview { get; set; } = string.Empty;
        [JsonPropertyName("questionType")]
        public string QuestionType { get; set; } = string.Empty;
        [JsonPropertyName("questionText")]
        public string QuestionText { get; set; } = string.Empty;
        [JsonPropertyName("duration")]
        public int Duration { get; set; }
        [JsonPropertyName("minimumWords")]
        public int MinimumWords { get; set; }
        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = "Task2";
        [JsonPropertyName("level")]
        public string Level { get; set; } = "Academic";
        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }
        [JsonPropertyName("imageDescription")]
        public string? ImageDescription { get; set; }
    }

    public class WritingPromptResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public WritingPromptDto? Data { get; set; }
    }

    public class WritingPromptListResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<WritingPromptDto> Data { get; set; } = new();
    }

    public class WritingPromptDto
    {
        [JsonPropertyName("writingPromptId")]
        public Guid WritingPromptId { get; set; }

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("preview")]
        public string Preview { get; set; } = string.Empty;

        [JsonPropertyName("questionType")]
        public string QuestionType { get; set; } = string.Empty;

        [JsonPropertyName("questionText")]
        public string QuestionText { get; set; } = string.Empty;

        [JsonPropertyName("duration")]
        public int Duration { get; set; }

        [JsonPropertyName("minimumWords")]
        public int MinimumWords { get; set; }

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; }

        [JsonPropertyName("level")]
        public string Level { get; set; }

        [JsonPropertyName("imageUrl")]
        public string? ImageUrl { get; set; }
        [JsonPropertyName("imageDescription")]
        public string? ImageDescription { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }
}