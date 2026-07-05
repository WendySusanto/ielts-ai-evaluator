using System.Net.Http;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using IELTS.AI.Evaluator.Functions.Constants;
using IELTS.AI.Evaluator.Functions.Models;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IGeminiApiClient
    {
        Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey);
        Task<string> EvaluateSpeakingAsync(string transcript, string question, string? cuepoints, string? part, string apiKey);
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
                "## Prompt\n{1}\n\n" +
                "## User Essay\n{2}\n\n" +
                "## Image Description (for Writing Task 1)\n{3}\n\n" +
                "## Evaluation Guidelines\n" +
                "- Be strict but fair.\n" +
                "- Only use image description for Writing Task 1. Ignore if unavailable.\n" +
                "- Each sub-score should range from 0 to 9 in 0.5 increments.\n" +
                "- The overallBand should be the average of the four main criteria band scores, rounded to the nearest 0.5.\n" +
                "- For the `issues` part, provide all text that has a problem and explain why. Include all issues in the array.";

                var prompt = string.Format(promptTemplate, taskType, question, userAnswer, imageDescription);

                var endpoint = _configuration["GeminiApiEndpoint"];

                if (string.IsNullOrEmpty(endpoint))
                {
                    throw new Exception("GeminiApiEndpoint has not been setup yet");
                }

                var geminiRequest = new GeminiRequest
                {
                    Contents = new List<GeminiContent>
                    {
                        new GeminiContent
                        {
                            Parts = new List<GeminiPart>
                            {
                                new GeminiPart { Text = prompt }
                            }
                        }
                    },
                    GenerationConfig = new GeminiGenerationConfig
                    {
                        ResponseMimeType = "application/json",
                        ResponseSchema = GeminiSchemas.IeltsEvaluationSchema
                    }
                };

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var payload = JsonSerializer.Serialize(geminiRequest, jsonOptions);

                var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                request.Headers.Add("X-goog-api-key", apiKey);

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

        public async Task<string> EvaluateSpeakingAsync(string transcript, string question, string? cuepoints, string? part, string apiKey)
        {
            try
            {
                var promptTemplate =
                "You are an IELTS examiner. Evaluate the following IELTS Speaking {0} response according to the official IELTS Speaking band descriptors: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation.\n\n" +
                "## Question / Cue Card\n{1}\n\n" +
                "## Cue Points (if any)\n{2}\n\n" +
                "## Candidate Response (transcribed speech)\n{3}\n\n" +
                "## Evaluation Guidelines\n" +
                "- Be strict but fair, as a real IELTS examiner would be.\n" +
                "- The response is a transcript of spoken English, so judge fluency and coherence from the flow and connectives, and infer pronunciation issues only where the transcript clearly suggests them (do not over-penalise pronunciation since you only have text).\n" +
                "- Each sub-score should range from 0 to 9 in 0.5 increments.\n" +
                "- The overallBand should be the average of the four main criteria band scores, rounded to the nearest 0.5.\n" +
                "- For the `issues` part, quote the exact text that has a problem and explain why. Include all issues in the array.";

                var prompt = string.Format(promptTemplate, part, question, cuepoints ?? "N/A", transcript);

                var endpoint = _configuration["GeminiApiEndpoint"];

                if (string.IsNullOrEmpty(endpoint))
                {
                    throw new Exception("GeminiApiEndpoint has not been setup yet");
                }

                var geminiRequest = new GeminiRequest
                {
                    Contents = new List<GeminiContent>
                    {
                        new GeminiContent
                        {
                            Parts = new List<GeminiPart>
                            {
                                new GeminiPart { Text = prompt }
                            }
                        }
                    },
                    GenerationConfig = new GeminiGenerationConfig
                    {
                        ResponseMimeType = "application/json",
                        ResponseSchema = GeminiSchemas.IeltsSpeakingSchema
                    }
                };

                var jsonOptions = new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                };

                var payload = JsonSerializer.Serialize(geminiRequest, jsonOptions);

                var request = new HttpRequestMessage(HttpMethod.Post, endpoint);
                request.Content = new StringContent(payload, Encoding.UTF8, "application/json");
                request.Headers.Add("X-goog-api-key", apiKey);

                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();
                var result = await response.Content.ReadAsStringAsync();
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini API for speaking evaluation");
                throw;
            }
        }
    }
}
