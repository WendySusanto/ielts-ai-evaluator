using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IGeminiApiClient
    {
        Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey);
    }

    public class GeminiApiClient : IGeminiApiClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<GeminiApiClient> _logger;
        private readonly IConfiguration _configuration;

        public GeminiApiClient(HttpClient httpClient, ILogger<GeminiApiClient> logger, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _logger = logger;
            _configuration = configuration;
        }

        public async Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey)
        {
            try
            {
                var promptTemplate =
                "You are an IELTS examiner. Evaluate the following IELTS Writing {0} essay according to the official IELTS Writing band descriptors: Task Response, Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.\n\n" +
                "## Prompt {1}\n" +
                "## User Essay{2}\n" +
                "## Image Description\n (for Writing Task 1) {3}\n" +
                "## Output Instructions\n" +
                "- Be strict but fair.\n" +
                "- Only use image description for Writing Task 1. And just ignore if it's unavailable\n" +
                "- Each sub-score should range from 0 to 9 in 0.5 increments.\n" +
                "- The overallBand should be the average of the four main criteria band scores, rounded to the nearest 0.5.\n" +
                "- For the `issues` part, provide all text that has a problem, and why. Please mention all the issues in array\n" +
                "- Respond ONLY with a JSON object in the structure below. Do not include any explanation or text outside the JSON.\n\n" +
                "```json\n" +
                "{{\n  \"overallBand\": <number>,\n  \"criteria\": {{\n    \"taskResponse\": {{\n      \"band\": <number>,\n      \"generalFeedback\": \"\",\n      \"subScores\": {{\n        \"addressAllPartsOfQuestion\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"clearOpinionIfRequired\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"wellDevelopedIdeas\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"examplesAndSupport\": {{ \"score\": <number>, \"comment\": \"\" }}\n      }},\n      \"issues\": [ {{ \"text\": \"\", \"comment\": \"\" }} ]\n    }},\n    \"coherenceCohesion\": {{\n      \"band\": <number>,\n      \"generalFeedback\": \"\",\n      \"subScores\": {{\n        \"logicalFlowOfIdeas\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"paragraphing\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"cohesiveDevices\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"referencingClarity\": {{ \"score\": <number>, \"comment\": \"\" }}\n      }},\n      \"issues\": [ {{ \"text\": \"\", \"comment\": \"\" }} ]\n    }},\n    \"lexicalResource\": {{\n      \"band\": <number>,\n      \"generalFeedback\": \"\",\n      \"subScores\": {{\n        \"vocabularyRange\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"wordChoiceAccuracy\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"collocations\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"spelling\": {{ \"score\": <number>, \"comment\": \"\" }}\n      }},\n      \"issues\": [ {{ \"text\": \"\", \"comment\": \"\" }} ]\n    }},\n    \"grammaticalRangeAccuracy\": {{\n      \"band\": <number>,\n      \"generalFeedback\": \"\",\n      \"subScores\": {{\n        \"sentenceVariety\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"tenseAccuracy\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"subjectVerbAgreement\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"articleAndPrepositionUse\": {{ \"score\": <number>, \"comment\": \"\" }},\n        \"errorDensity\": {{ \"score\": <number>, \"comment\": \"\" }}\n      }},\n      \"issues\": [ {{ \"text\": \"\", \"comment\": \"\" }} ]\n    }}\n  }}\n}}\n```";


                var prompt = string.Format(promptTemplate, taskType, question, userAnswer, imageDescription);

                var endpoint = _configuration["GeminiApiEndpoint"];
                var payload = $"{{\"contents\":[{{\"parts\":[{{\"text\":\"{prompt.Replace("\"", "\\\"").Replace("\n", "\\n") }\"}}]}}]}}";
                var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                request.Headers.Add("X-goog-api-key", apiKey);

                if (string.IsNullOrEmpty(endpoint))
                {
                    throw new Exception("GeminiApiEndpoint has not been setup yet");
                }
            
                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();
                var result = await response.Content.ReadAsStringAsync();
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API");
                throw;
            }
        }
    }
}
