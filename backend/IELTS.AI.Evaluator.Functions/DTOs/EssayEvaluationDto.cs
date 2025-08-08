using System;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{
    public class EssayEvaluationRequestDto
    {
        [JsonPropertyName("userAnswer")]
        public string UserAnswer { get; set; } = string.Empty;

        [JsonPropertyName("writingPromptId")]
        public Guid WritingPromptId { get; set; }

        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("userId")]
        public Guid UserId { get; set; }

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = string.Empty;

        [JsonPropertyName("imageDescription")]
        public string? ImageDescription { get; set; }
    }

    public class EssayEvaluationDataDto
    {
        [JsonPropertyName("overallBand")]
        public decimal OverallBand { get; set; }

        [JsonPropertyName("rawJson")]
        public string RawJson { get; set; } = string.Empty;

        [JsonPropertyName("aiModel")]
        public string AiModel { get; set; } = string.Empty;

        [JsonPropertyName("promptTokenCount")]
        public int PromptTokenCount { get; set; }

        [JsonPropertyName("candidatesTokenCount")]
        public int CandidatesTokenCount { get; set; }

        [JsonPropertyName("essayEvaluationId")]
        public Guid EssayEvaluationId { get; set; }
    }

    public class EssayEvaluationResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public EssayEvaluationDataDto? Data { get; set; }
    }
}
