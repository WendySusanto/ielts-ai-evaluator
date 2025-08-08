using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.DTOs
{
    public class IeltsEvaluationResponse
    {
        [JsonPropertyName("overallBand")]
        public double OverallBand { get; set; }

        [JsonPropertyName("criteria")]
        public Criteria Criteria { get; set; }
    }

    public class Criteria
    {
        [JsonPropertyName("taskResponse")]
        public TaskResponse TaskResponse { get; set; }

        [JsonPropertyName("coherenceCohesion")]
        public CoherenceCohesion CoherenceCohesion { get; set; }

        [JsonPropertyName("lexicalResource")]
        public LexicalResource LexicalResource { get; set; }

        [JsonPropertyName("grammaticalRangeAccuracy")]
        public GrammaticalRangeAccuracy GrammaticalRangeAccuracy { get; set; }
    }

    public class TaskResponse
    {
        [JsonPropertyName("band")]
        public double Band { get; set; }

        [JsonPropertyName("generalFeedback")]
        public string GeneralFeedback { get; set; }

        [JsonPropertyName("subScores")]
        public TaskResponseSubScores SubScores { get; set; }

        [JsonPropertyName("issues")]
        public List<Issue> Issues { get; set; }
    }

    public class TaskResponseSubScores
    {
        [JsonPropertyName("addressAllPartsOfQuestion")]
        public SubScore AddressAllPartsOfQuestion { get; set; }

        [JsonPropertyName("clearOpinionIfRequired")]
        public SubScore ClearOpinionIfRequired { get; set; }

        [JsonPropertyName("wellDevelopedIdeas")]
        public SubScore WellDevelopedIdeas { get; set; }

        [JsonPropertyName("examplesAndSupport")]
        public SubScore ExamplesAndSupport { get; set; }
    }

    public class CoherenceCohesion
    {
        [JsonPropertyName("band")]
        public double Band { get; set; }

        [JsonPropertyName("generalFeedback")]
        public string GeneralFeedback { get; set; }

        [JsonPropertyName("subScores")]
        public CoherenceCohesionSubScores SubScores { get; set; }

        [JsonPropertyName("issues")]
        public List<Issue> Issues { get; set; }
    }

    public class CoherenceCohesionSubScores
    {
        [JsonPropertyName("logicalFlowOfIdeas")]
        public SubScore LogicalFlowOfIdeas { get; set; }

        [JsonPropertyName("paragraphing")]
        public SubScore Paragraphing { get; set; }

        [JsonPropertyName("cohesiveDevices")]
        public SubScore CohesiveDevices { get; set; }

        [JsonPropertyName("referencingClarity")]
        public SubScore ReferencingClarity { get; set; }
    }

    public class LexicalResource
    {
        [JsonPropertyName("band")]
        public double Band { get; set; }

        [JsonPropertyName("generalFeedback")]
        public string GeneralFeedback { get; set; }

        [JsonPropertyName("subScores")]
        public LexicalResourceSubScores SubScores { get; set; }

        [JsonPropertyName("issues")]
        public List<Issue> Issues { get; set; }
    }

    public class LexicalResourceSubScores
    {
        [JsonPropertyName("vocabularyRange")]
        public SubScore VocabularyRange { get; set; }

        [JsonPropertyName("wordChoiceAccuracy")]
        public SubScore WordChoiceAccuracy { get; set; }

        [JsonPropertyName("collocations")]
        public SubScore Collocations { get; set; }

        [JsonPropertyName("spelling")]
        public SubScore Spelling { get; set; }
    }

    public class GrammaticalRangeAccuracy
    {
        [JsonPropertyName("band")]
        public double Band { get; set; }

        [JsonPropertyName("generalFeedback")]
        public string GeneralFeedback { get; set; }

        [JsonPropertyName("subScores")]
        public GrammaticalRangeAccuracySubScores SubScores { get; set; }

        [JsonPropertyName("issues")]
        public List<Issue> Issues { get; set; }
    }

    public class GrammaticalRangeAccuracySubScores
    {
        [JsonPropertyName("sentenceVariety")]
        public SubScore SentenceVariety { get; set; }

        [JsonPropertyName("tenseAccuracy")]
        public SubScore TenseAccuracy { get; set; }

        [JsonPropertyName("subjectVerbAgreement")]
        public SubScore SubjectVerbAgreement { get; set; }

        [JsonPropertyName("articleAndPrepositionUse")]
        public SubScore ArticleAndPrepositionUse { get; set; }

        [JsonPropertyName("errorDensity")]
        public SubScore ErrorDensity { get; set; }
    }

    public class SubScore
    {
        [JsonPropertyName("score")]
        public double Score { get; set; }

        [JsonPropertyName("comment")]
        public string Comment { get; set; }
    }

    public class Issue
    {
        [JsonPropertyName("text")]
        public string Text { get; set; }

        [JsonPropertyName("comment")]
        public string Comment { get; set; }
    }

    public class EvaluationHistoryItemDto
    {
        [JsonPropertyName("essayEvaluationId")]
        public Guid EssayEvaluationId { get; set; }

        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("overallBand")]
        public decimal OverallBand { get; set; }

        [JsonPropertyName("createdAt")]
        public DateTime CreatedAt { get; set; }

        [JsonPropertyName("feedback")]
        public IeltsEvaluationResponse? Feedback { get; set; }

        [JsonPropertyName("evaluationType")]
        public string EvaluationType { get; set; } = "Writing";
    }

    public class EvaluationHistoryResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public List<EvaluationHistoryItemDto> Data { get; set; } = new();
    }

    public class EvaluationDetailDataDto
    {
        [JsonPropertyName("taskType")]
        public string TaskType { get; set; } = string.Empty;

        [JsonPropertyName("topic")]
        public string Topic { get; set; } = string.Empty;

        [JsonPropertyName("userAnswer")]
        public string UserAnswer { get; set; } = string.Empty;

        [JsonPropertyName("feedback")]
        public IeltsEvaluationResponse? Feedback { get; set; }
    }

    public class EvaluationDetailResponseDto
    {
        [JsonPropertyName("success")]
        public bool Success { get; set; }

        [JsonPropertyName("message")]
        public string Message { get; set; } = string.Empty;

        [JsonPropertyName("data")]
        public EvaluationDetailDataDto? Data { get; set; }
    }
}
