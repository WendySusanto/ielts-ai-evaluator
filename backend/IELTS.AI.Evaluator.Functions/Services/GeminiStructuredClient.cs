using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public record GeminiResult<T>(T Value, string Model, int PromptTokens, int CompletionTokens);

public interface IGeminiStructuredClient
{
    /// <summary>Calls Gemini generateContent with responseMimeType=application/json and the given
    /// responseSchema (Gemini schema JSON as a string), deserializing the reply into T. Retries
    /// transient rejections; see <see cref="GeminiStructuredClient.RetryDelays"/>. A non-null
    /// thinkingBudget is sent as thinkingConfig (0 turns thinking off for latency-sensitive calls).</summary>
    Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson,
        CancellationToken ct = default, int? thinkingBudget = null);
}

public class GeminiStructuredClient : IGeminiStructuredClient
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    /// <summary>Gemini answers 429 (quota) and 503 (model overloaded) routinely under load, and
    /// both clear on their own within seconds — so a single attempt turns a vendor hiccup into a
    /// lost evaluation. Every other status is deterministic (400 schema, 401/403 key), and
    /// retrying those only makes the user wait longer for the same failure.</summary>
    // ponytail: fixed backoff, no jitter, Retry-After header ignored. One request per user action,
    // so there is no thundering herd to spread out — add jitter if evaluations ever run in batches.
    internal static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3)];

    private static bool IsTransient(HttpStatusCode status) =>
        status is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable;

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiStructuredClient> _logger;

    public GeminiStructuredClient(HttpClient http, IConfiguration config, ILogger<GeminiStructuredClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson,
        CancellationToken ct = default, int? thinkingBudget = null)
    {
        var apiKey = _config["GeminiApiKey"];
        var endpoint = _config["GeminiApiEndpoint"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(endpoint))
            throw new InvalidOperationException("Gemini configuration missing");

        using var schema = JsonDocument.Parse(responseSchemaJson);
        var generationConfig = new Dictionary<string, object>
        {
            ["responseMimeType"] = "application/json",
            ["responseSchema"] = schema.RootElement,
        };
        if (thinkingBudget is not null)
            generationConfig["thinkingConfig"] = new { thinkingBudget };
        var payload = new
        {
            systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = userContent } } } },
            generationConfig,
        };
        // Serialized once: every attempt posts the same body, and HttpRequestMessage is single-use.
        var payloadJson = JsonSerializer.Serialize(payload);

        for (var attempt = 0; ; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
            {
                Content = new StringContent(payloadJson, Encoding.UTF8, "application/json"),
            };
            request.Headers.Add("x-goog-api-key", apiKey);

            using var response = await _http.SendAsync(request, ct);
            var body = await response.Content.ReadAsStringAsync(ct);

            if (response.IsSuccessStatusCode)
                return Parse<T>(body);

            if (IsTransient(response.StatusCode) && attempt < RetryDelays.Length)
            {
                _logger.LogWarning("Gemini returned {Status}; retrying in {Delay}s", (int)response.StatusCode,
                    RetryDelays[attempt].TotalSeconds);
                await Task.Delay(RetryDelays[attempt], ct);
                continue;
            }

            _logger.LogError("Gemini call failed: {Status} {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException($"Gemini call failed with status {(int)response.StatusCode}");
        }
    }

    private static GeminiResult<T> Parse<T>(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var text = doc.RootElement.GetProperty("candidates")[0]
            .GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()
            ?? throw new InvalidOperationException("Gemini returned empty content");

        var value = JsonSerializer.Deserialize<T>(text, CamelCase)
            ?? throw new InvalidOperationException("Gemini returned unparsable JSON");

        var model = doc.RootElement.TryGetProperty("modelVersion", out var m) ? m.GetString() ?? "" : "";
        var usage = doc.RootElement.TryGetProperty("usageMetadata", out var u) ? u : default;
        int Tok(string name) => usage.ValueKind == JsonValueKind.Object && usage.TryGetProperty(name, out var t) ? t.GetInt32() : 0;

        // Thinking tokens are billed as output, so they count toward completion spend.
        return new GeminiResult<T>(value, model, Tok("promptTokenCount"),
            Tok("candidatesTokenCount") + Tok("thoughtsTokenCount"));
    }
}
