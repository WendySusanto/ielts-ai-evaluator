using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{
    // ---------------------------------------------------------------------------
    // Speaking Prompt
    // ---------------------------------------------------------------------------
    public class SpeakingPromptUpsertRequestDto
    {
        [JsonPropertyName("speakingPromptId")]
        public Guid? SpeakingPromptId { get; set; }

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("preview")]
        public string Preview { get; set; } = string.Empty;

        [JsonPropertyName("part")]
        public string Part { get; set; } = "Part2";

        [JsonPropertyName("questionText")]
        public string QuestionText { get; set; } = string.Empty;

        [JsonPropertyName("cuepoints")]
        public string? Cuepoints { get; set; }

        [JsonPropertyName("duration")]
        public int Duration { get; set; }

        [JsonPropertyName("level")]
        public string Level { get; set; } = "Academic";
    }

    public class SpeakingPromptDto
    {
        [JsonPropertyName("speakingPromptId")]
        public Guid SpeakingPromptId { get; set; }

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;

        [JsonPropertyName("preview")]
        public string Preview { get; set; } = string.Empty;

        [JsonPropertyName("part")]
        public string Part { get; set; } = string.Empty;

        [JsonPropertyName("questionText")]
        public string QuestionText { get; set; } = string.Empty;

        [JsonPropertyName("cuepoints")]
        public string? Cuepoints { get; set; }

        [JsonPropertyName("duration")]
        public int Duration { get; set; }

        [JsonPropertyName("level")]
        public string Level { get; set; } = string.Empty;

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("updatedAt")]
        public DateTime UpdatedAt { get; set; }
    }

    public class SpeakingPromptResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public SpeakingPromptDto? Data { get; set; }
    }

    public class SpeakingPromptListResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<SpeakingPromptDto> Data { get; set; } = new();
    }

    // ---------------------------------------------------------------------------
    // Speaking Evaluation
    // ---------------------------------------------------------------------------
    public class SpeakingEvaluationRequestDto
    {
        [JsonPropertyName("transcript")]
        public string Transcript { get; set; } = string.Empty;

        [JsonPropertyName("speakingPromptId")]
        public Guid SpeakingPromptId { get; set; }

        [JsonPropertyName("question")]
        public string Question { get; set; } = string.Empty;

        [JsonPropertyName("part")]
        public string Part { get; set; } = string.Empty;

        [JsonPropertyName("cuepoints")]
        public string? Cuepoints { get; set; }
    }

    public class SpeakingEvaluationDataDto
    {
        [JsonPropertyName("speakingEvaluationId")]
        public Guid SpeakingEvaluationId { get; set; }

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
    }

    public class SpeakingEvaluationResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public SpeakingEvaluationDataDto? Data { get; set; }
    }

    // ---------------------------------------------------------------------------
    // Speaking evaluation feedback (mirrors IeltsEvaluationResponse shape so the
    // frontend can reuse the same feedback rendering components).
    // ---------------------------------------------------------------------------
    public class SpeakingEvaluationResponse
    {
        [JsonPropertyName("overallBand")]
        public double OverallBand { get; set; }

        [JsonPropertyName("criteria")]
        public SpeakingCriteria Criteria { get; set; }
    }

    public class SpeakingCriteria
    {
        [JsonPropertyName("fluencyCoherence")]
        public SpeakingCriterion FluencyCoherence { get; set; }

        [JsonPropertyName("lexicalResource")]
        public SpeakingCriterion LexicalResource { get; set; }

        [JsonPropertyName("grammaticalRangeAccuracy")]
        public SpeakingCriterion GrammaticalRangeAccuracy { get; set; }

        [JsonPropertyName("pronunciation")]
        public SpeakingCriterion Pronunciation { get; set; }
    }

    public class SpeakingCriterion
    {
        [JsonPropertyName("band")]
        public double Band { get; set; }

        [JsonPropertyName("generalFeedback")]
        public string GeneralFeedback { get; set; }

        [JsonPropertyName("subScores")]
        public Dictionary<string, SubScore> SubScores { get; set; } = new();

        [JsonPropertyName("issues")]
        public List<Issue> Issues { get; set; } = new();
    }

    // ---------------------------------------------------------------------------
    // Speaking history / detail
    // ---------------------------------------------------------------------------
    public class SpeakingHistoryItemDto
    {
        [JsonPropertyName("speakingEvaluationId")]
        public Guid SpeakingEvaluationId { get; set; }

        [JsonPropertyName("part")]
        public string Part { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("overallBand")]
        public decimal OverallBand { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("feedback")]
        public SpeakingEvaluationResponse? Feedback { get; set; }

        [JsonPropertyName("evaluationType")]
        public string EvaluationType { get; set; } = "Speaking";
    }

    public class SpeakingHistoryResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<SpeakingHistoryItemDto> Data { get; set; } = new();
    }

    public class SpeakingDetailDataDto
    {
        [JsonPropertyName("part")]
        public string Part { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("transcript")]
        public string Transcript { get; set; } = string.Empty;

        [JsonPropertyName("feedback")]
        public SpeakingEvaluationResponse? Feedback { get; set; }
    }

    public class SpeakingDetailResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public SpeakingDetailDataDto? Data { get; set; }
    }
}
