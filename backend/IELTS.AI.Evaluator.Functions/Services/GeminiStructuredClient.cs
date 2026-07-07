using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public record GeminiResult<T>(T Value, string Model, int PromptTokens, int CompletionTokens);

public interface IGeminiStructuredClient
{
    /// <summary>Calls Gemini generateContent with responseMimeType=application/json and the given
    /// responseSchema (Gemini schema JSON as a string), deserializing the reply into T.</summary>
    Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson);
}

public class GeminiStructuredClient : IGeminiStructuredClient
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiStructuredClient> _logger;

    public GeminiStructuredClient(HttpClient http, IConfiguration config, ILogger<GeminiStructuredClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson)
    {
        var apiKey = _config["GeminiApiKey"];
        var endpoint = _config["GeminiApiEndpoint"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(endpoint))
            throw new InvalidOperationException("Gemini configuration missing");

        using var schema = JsonDocument.Parse(responseSchemaJson);
        var payload = new
        {
            systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = userContent } } } },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = schema.RootElement,
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        using var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini call failed: {Status} {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException($"Gemini call failed with status {(int)response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var text = doc.RootElement.GetProperty("candidates")[0]
            .GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()
            ?? throw new InvalidOperationException("Gemini returned empty content");

        var value = JsonSerializer.Deserialize<T>(text, CamelCase)
            ?? throw new InvalidOperationException("Gemini returned unparsable JSON");

        var model = doc.RootElement.TryGetProperty("modelVersion", out var m) ? m.GetString() ?? "" : "";
        var usage = doc.RootElement.TryGetProperty("usageMetadata", out var u) ? u : default;
        int Tok(string name) => usage.ValueKind == JsonValueKind.Object && usage.TryGetProperty(name, out var t) ? t.GetInt32() : 0;

        return new GeminiResult<T>(value, model, Tok("promptTokenCount"), Tok("candidatesTokenCount"));
    }
}
