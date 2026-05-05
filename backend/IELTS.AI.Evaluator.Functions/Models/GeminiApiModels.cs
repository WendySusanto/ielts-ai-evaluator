using System.Text.Json.Serialization;

namespace IELTS.AI.Evaluator.Functions.Models
{
    public class GeminiRequest
    {
        [JsonPropertyName("contents")]
        public List<GeminiContent> Contents { get; set; } = new();

        [JsonPropertyName("generationConfig")]
        public GeminiGenerationConfig? GenerationConfig { get; set; }
    }

    public class GeminiContent
    {
        [JsonPropertyName("parts")]
        public List<GeminiPart> Parts { get; set; } = new();
    }

    public class GeminiPart
    {
        [JsonPropertyName("text")]
        public string Text { get; set; } = string.Empty;
    }

    public class GeminiGenerationConfig
    {
        [JsonPropertyName("response_mime_type")]
        public string ResponseMimeType { get; set; } = "application/json";

        [JsonPropertyName("response_schema")]
        public object? ResponseSchema { get; set; }
    }
}
