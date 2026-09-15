using System.Net;
using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class GeminiStructuredClientTests
{
    private sealed record Verdict(string Grade, int Score);

    private sealed class CapturingHandler : HttpMessageHandler
    {
        public string? Body;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"candidates":[{"content":{"parts":[{"text":"{\"grade\":\"A\",\"score\":9}"}]}}],
                     "modelVersion":"gemini-test","usageMetadata":{"promptTokenCount":11,"candidatesTokenCount":7}}
                    """)
            };
        }
    }

    private static IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiApiKey"] = "k",
            ["GeminiApiEndpoint"] = "https://example.test/v1beta/models/gemini:generateContent",
        }).Build();

    [Fact]
    public async Task GenerateAsync_SendsSchemaAndParsesTypedResult()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var result = await client.GenerateAsync<Verdict>("sys", "user text",
            """{"type":"OBJECT","properties":{"grade":{"type":"STRING"},"score":{"type":"INTEGER"}}}""");

        Assert.Equal("A", result.Value.Grade);
        Assert.Equal(9, result.Value.Score);
        Assert.Equal("gemini-test", result.Model);
        Assert.Equal(11, result.PromptTokens);
        Assert.Equal(7, result.CompletionTokens);

        using var sent = JsonDocument.Parse(handler.Body!);
        var genCfg = sent.RootElement.GetProperty("generationConfig");
        Assert.Equal("application/json", genCfg.GetProperty("responseMimeType").GetString());
        Assert.True(genCfg.TryGetProperty("responseSchema", out _));
        Assert.Equal("sys", sent.RootElement.GetProperty("systemInstruction").GetProperty("parts")[0].GetProperty("text").GetString());
    }

    /// <summary>Answers with the scripted statuses in order, then OK forever. Counts attempts.</summary>
    private sealed class ScriptedHandler : HttpMessageHandler
    {
        private readonly Queue<HttpStatusCode> _statuses;

        public int Attempts { get; private set; }

        /// <summary>Fires as each attempt is served — lets a test cancel mid-flight.</summary>
        public Action? OnRequest;

        public ScriptedHandler(params HttpStatusCode[] statuses) => _statuses = new Queue<HttpStatusCode>(statuses);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Attempts++;
            OnRequest?.Invoke();
            var status = _statuses.Count > 0 ? _statuses.Dequeue() : HttpStatusCode.OK;
            return Task.FromResult(new HttpResponseMessage(status)
            {
                Content = new StringContent(status == HttpStatusCode.OK
                    ? """
                      {"candidates":[{"content":{"parts":[{"text":"{\"grade\":\"A\",\"score\":9}"}]}}]}
                      """
                    : """{"error":{"message":"model is overloaded"}}"""),
            });
        }
    }

    [Fact]
    public async Task GenerateAsync_RetriesOverloadedModel_ThenSucceeds()
    {
        var handler = new ScriptedHandler(HttpStatusCode.ServiceUnavailable, HttpStatusCode.TooManyRequests);
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var result = await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""");

        Assert.Equal("A", result.Value.Grade);
        Assert.Equal(3, handler.Attempts);
    }

    [Fact]
    public async Task GenerateAsync_TransientThroughout_StopsAtRetryBudget()
    {
        // Guards the retry ceiling specifically: an off-by-one here bills the vendor in a loop.
        var handler = new ScriptedHandler(Enumerable.Repeat(HttpStatusCode.ServiceUnavailable, 10).ToArray());
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}"""));

        Assert.Equal(GeminiStructuredClient.RetryDelays.Length + 1, handler.Attempts);
    }

    [Fact]
    public async Task GenerateAsync_BadRequest_IsNotRetried()
    {
        // A rejected schema fails the same way every time; retrying only makes the user wait.
        var handler = new ScriptedHandler(HttpStatusCode.BadRequest);
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}"""));

        Assert.Equal(1, handler.Attempts);
    }

    [Fact]
    public async Task GenerateAsync_CancelledMidRetry_StopsInsteadOfSpending()
    {
        // The backoff delay has to observe the token: without it, an abandoned request keeps
        // retrying a paid endpoint after the caller is already gone.
        using var cts = new CancellationTokenSource();
        var handler = new ScriptedHandler(Enumerable.Repeat(HttpStatusCode.ServiceUnavailable, 10).ToArray());
        handler.OnRequest = cts.Cancel;
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", cts.Token));

        Assert.Equal(1, handler.Attempts);
    }

    [Fact]
    public async Task GenerateAsync_MalformedModelJson_Throws()
    {
        var handler = new CapturingHandler();
        // score as string breaks Verdict's int — handled by making T parse strict
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);
        await Assert.ThrowsAnyAsync<Exception>(() =>
            client.GenerateAsync<int[]>("sys", "user", """{"type":"ARRAY"}"""));
    }
}
