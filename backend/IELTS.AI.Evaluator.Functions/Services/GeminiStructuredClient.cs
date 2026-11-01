using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public record GeminiResult<T>(T Value, string Model, int PromptTokens, int CompletionTokens);

/// <summary>One piece of a user turn: text, or media sent inline as base64 (Gemini caps a whole
/// request at 20 MB). Interleaving them is how a recording is tied to the transcript line before it.</summary>
public record GeminiPart(string? Text, string? MimeType = null, byte[]? Data = null)
{
    public static GeminiPart FromText(string text) => new(text);
    public static GeminiPart Inline(string mimeType, byte[] data) => new(null, mimeType, data);
}

public interface IGeminiStructuredClient
{
    /// <summary>Gemini call with a JSON responseSchema, deserialized into T; retries transient errors.
    /// Optional thinking config, endpoint (picks the model) and timeout (default 45s, never retried).</summary>
    Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson,
        CancellationToken ct = default, int? thinkingBudget = null, string? endpoint = null,
        string? thinkingLevel = null, TimeSpan? timeout = null);

    /// <summary>The same call with a user turn made of several parts — text and inline media, read by
    /// Gemini in this order. The string overload is the single-text-part case.</summary>
    Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, IReadOnlyList<GeminiPart> userParts, string responseSchemaJson,
        CancellationToken ct = default, int? thinkingBudget = null, string? endpoint = null,
        string? thinkingLevel = null, TimeSpan? timeout = null);
}

public class GeminiStructuredClient : IGeminiStructuredClient
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    /// <summary>Only 429/503 are retried: they clear in seconds; anything else just fails again.
    /// ponytail: fixed backoff, no jitter — add jitter if evaluations ever run in batches.</summary>
    internal static readonly TimeSpan[] RetryDelays = [TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(3)];

    /// <summary>Per-attempt limit for ordinary calls. Retried like any other hiccup, so the worst
    /// case is 45+1+45+3+45 ≈ 139s — inside the Functions host's 230s HTTP limit.</summary>
    internal static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(45);

    /// <summary>For the two scoring calls: long enough for a slow high-thinking call, short enough to fit
    /// one 429/503 retry inside the host's 230s HTTP limit.</summary>
    public static readonly TimeSpan ScoringTimeout = TimeSpan.FromSeconds(150);

    private static readonly string[] ThinkingLevels = ["low", "medium", "high"];

    /// <summary>Parses a thinking level. Anything but low/medium/high (a typo, or "minimal", which
    /// 3.8-flash rejects) returns null, so the call uses the model default instead of failing.</summary>
    public static string? ThinkingLevelSetting(string? configured)
    {
        var level = configured?.Trim().ToLowerInvariant();
        return level is not null && ThinkingLevels.Contains(level) ? level : null;
    }

    private static bool IsTransient(HttpStatusCode status) =>
        status is HttpStatusCode.TooManyRequests or HttpStatusCode.ServiceUnavailable;

    /// <summary>Timeouts and dropped connections are transient like a 503 — but a cancellation the caller
    /// asked for is not, so ct is checked first.</summary>
    private static bool IsTransient(Exception ex, CancellationToken ct) =>
        !ct.IsCancellationRequested && ex is HttpRequestException or TaskCanceledException;

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiStructuredClient> _logger;

    public GeminiStructuredClient(HttpClient http, IConfiguration config, ILogger<GeminiStructuredClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson,
        CancellationToken ct = default, int? thinkingBudget = null, string? endpoint = null,
        string? thinkingLevel = null, TimeSpan? timeout = null) =>
        GenerateAsync<T>(systemInstruction, [GeminiPart.FromText(userContent)], responseSchemaJson, ct,
            thinkingBudget, endpoint, thinkingLevel, timeout);

    public async Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, IReadOnlyList<GeminiPart> userParts,
        string responseSchemaJson, CancellationToken ct = default, int? thinkingBudget = null, string? endpoint = null,
        string? thinkingLevel = null, TimeSpan? timeout = null)
    {
        var apiKey = _config["GeminiApiKey"];
        var resolvedEndpoint = string.IsNullOrWhiteSpace(endpoint) ? _config["GeminiApiEndpoint"] : endpoint;
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(resolvedEndpoint))
            throw new InvalidOperationException("Gemini configuration missing");

        using var schema = JsonDocument.Parse(responseSchemaJson);
        var generationConfig = new Dictionary<string, object>
        {
            ["responseMimeType"] = "application/json",
            ["responseSchema"] = schema.RootElement,
        };
        var thinkingConfig = new Dictionary<string, object>();
        if (thinkingBudget is not null)
            thinkingConfig["thinkingBudget"] = thinkingBudget;
        if (thinkingLevel is not null)
            thinkingConfig["thinkingLevel"] = thinkingLevel;
        if (thinkingConfig.Count > 0)
            generationConfig["thinkingConfig"] = thinkingConfig;
        var payload = new
        {
            systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
            contents = new[] { new { role = "user", parts = userParts.Select(ToWire).ToArray() } },
            generationConfig,
        };
        // Serialized once: every attempt posts the same body, and HttpRequestMessage is single-use.
        var payloadJson = JsonSerializer.Serialize(payload);

        for (var attempt = 0; ; attempt++)
        {
            using var request = new HttpRequestMessage(HttpMethod.Post, resolvedEndpoint)
            {
                Content = new StringContent(payloadJson, Encoding.UTF8, "application/json"),
            };
            request.Headers.Add("x-goog-api-key", apiKey);

            // One limit per attempt, on top of the caller's own token. Not HttpClient.Timeout: that is
            // one number for every call this client makes.
            using var attemptLimit = CancellationTokenSource.CreateLinkedTokenSource(ct);
            attemptLimit.CancelAfter(timeout ?? DefaultTimeout);

            HttpResponseMessage response;
            try
            {
                response = await _http.SendAsync(request, attemptLimit.Token);
            }
            // A caller-chosen timeout is final — see the timeout parameter.
            catch (OperationCanceledException) when (timeout is not null && !ct.IsCancellationRequested)
            {
                throw new TimeoutException($"Gemini did not answer within {timeout.Value.TotalSeconds:0.#}s.");
            }
            // Only SendAsync is guarded: the throws below are deliberate verdicts, not hiccups.
            catch (Exception ex) when (IsTransient(ex, ct) && attempt < RetryDelays.Length)
            {
                _logger.LogWarning("Gemini call faulted ({Error}); retrying in {Delay}s", ex.Message,
                    RetryDelays[attempt].TotalSeconds);
                await Task.Delay(RetryDelays[attempt], ct);
                continue;
            }

            using (response)
            {
                var body = await response.Content.ReadAsStringAsync(attemptLimit.Token);

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
                throw new HttpRequestException($"Gemini call failed with status {(int)response.StatusCode}", null,
                    response.StatusCode);
            }
        }
    }

    /// <summary>Gemini's wire shape for one part: {"text": …} or {"inlineData": {"mimeType", "data"}}.</summary>
    private static object ToWire(GeminiPart part) => part.Data is null
        ? new { text = part.Text }
        : new { inlineData = new { mimeType = part.MimeType, data = Convert.ToBase64String(part.Data) } };

    private static GeminiResult<T> Parse<T>(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var candidate = doc.RootElement.GetProperty("candidates")[0];
        // Why generation stopped. STOP is normal; MAX_TOKENS or SAFETY explain an answer that is cut
        // off or missing, which otherwise looks exactly like the model returning bad JSON.
        var finishReason = candidate.TryGetProperty("finishReason", out var f) ? f.GetString() : null;

        if (!candidate.TryGetProperty("content", out var content))
            throw new InvalidOperationException($"Gemini returned no content (finishReason: {finishReason})");
        var text = content.GetProperty("parts")[0].GetProperty("text").GetString()
            ?? throw new InvalidOperationException($"Gemini returned empty content (finishReason: {finishReason})");

        T value;
        try
        {
            value = JsonSerializer.Deserialize<T>(text, CamelCase)
                ?? throw new InvalidOperationException($"Gemini returned null JSON (finishReason: {finishReason})");
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException($"Gemini returned unparsable JSON (finishReason: {finishReason})", ex);
        }

        var model = doc.RootElement.TryGetProperty("modelVersion", out var m) ? m.GetString() ?? "" : "";
        var usage = doc.RootElement.TryGetProperty("usageMetadata", out var u) ? u : default;
        int Tok(string name) => usage.ValueKind == JsonValueKind.Object && usage.TryGetProperty(name, out var t) ? t.GetInt32() : 0;

        // Thinking tokens are billed as output, so they count toward completion spend.
        return new GeminiResult<T>(value, model, Tok("promptTokenCount"),
            Tok("candidatesTokenCount") + Tok("thoughtsTokenCount"));
    }
}
