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
        public Uri? Uri;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Body = await request.Content!.ReadAsStringAsync(ct);
            Uri = request.RequestUri;
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"candidates":[{"content":{"parts":[{"text":"{\"grade\":\"A\",\"score\":9}"}]}}],
                     "modelVersion":"gemini-test","usageMetadata":{"promptTokenCount":11,"candidatesTokenCount":7,"thoughtsTokenCount":5}}
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
        Assert.Equal(12, result.CompletionTokens); // candidates + thoughts: thinking is billed as output

        using var sent = JsonDocument.Parse(handler.Body!);
        var genCfg = sent.RootElement.GetProperty("generationConfig");
        Assert.Equal("application/json", genCfg.GetProperty("responseMimeType").GetString());
        Assert.True(genCfg.TryGetProperty("responseSchema", out _));
        Assert.False(genCfg.TryGetProperty("thinkingConfig", out _)); // model default unless asked
        Assert.False(genCfg.TryGetProperty("temperature", out _)); // nothing sends a temperature: Gemini 3 is tuned for its default
        Assert.Equal("sys", sent.RootElement.GetProperty("systemInstruction").GetProperty("parts")[0].GetProperty("text").GetString());
    }

    [Fact]
    public async Task GenerateAsync_WithThinkingBudget_SendsThinkingConfig()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", thinkingBudget: 0);

        using var sent = JsonDocument.Parse(handler.Body!);
        var thinking = sent.RootElement.GetProperty("generationConfig").GetProperty("thinkingConfig");
        Assert.Equal(0, thinking.GetProperty("thinkingBudget").GetInt32());
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

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}"""));

        Assert.Equal(HttpStatusCode.BadRequest, ex.StatusCode); // callers tell an unbilled rejection apart by it
        Assert.Equal(1, handler.Attempts);
    }

    /// <summary>A recording is tied to its answer by position, so the parts must reach Gemini in the
    /// order given, audio as inlineData.</summary>
    [Fact]
    public async Task GenerateAsync_WithParts_SendsTextAndInlineAudioInOrder()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys",
            [GeminiPart.FromText("Candidate (answer 1): hi"), GeminiPart.Inline("audio/webm", [1, 2, 3]), GeminiPart.FromText("end")],
            """{"type":"OBJECT"}""");

        using var sent = JsonDocument.Parse(handler.Body!);
        var parts = sent.RootElement.GetProperty("contents")[0].GetProperty("parts");
        Assert.Equal(3, parts.GetArrayLength());
        Assert.Equal("Candidate (answer 1): hi", parts[0].GetProperty("text").GetString());
        Assert.Equal("audio/webm", parts[1].GetProperty("inlineData").GetProperty("mimeType").GetString());
        Assert.Equal("AQID", parts[1].GetProperty("inlineData").GetProperty("data").GetString());
        Assert.Equal("end", parts[2].GetProperty("text").GetString());
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

    [Theory]
    [InlineData("high", "high")]
    [InlineData(" Medium ", "medium")]
    [InlineData("minimal", null)] // gemini-3.8-flash rejects it with a 400
    [InlineData("hgih", null)]
    [InlineData("", null)]
    [InlineData(null, null)]
    public void ThinkingLevelSetting_KeepsTheThreeLevels_DropsAnythingElse(string? configured, string? expected) =>
        Assert.Equal(expected, GeminiStructuredClient.ThinkingLevelSetting(configured));

    /// <summary>The examiner turn and the scoring call want different models, and the model name
    /// lives inside the endpoint URL. A caller-supplied endpoint therefore has to beat the
    /// configured one; null keeps the configured default, which every other test here relies on.</summary>
    [Fact]
    public async Task GenerateAsync_WithEndpoint_OverridesTheConfiguredOne()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""",
            endpoint: "https://example.test/v1beta/models/gemini-cheap:generateContent");

        Assert.Equal("https://example.test/v1beta/models/gemini-cheap:generateContent", handler.Uri!.ToString());
    }

    [Fact]
    public async Task GenerateAsync_WithoutEndpoint_UsesTheConfiguredOne()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""");

        Assert.Equal("https://example.test/v1beta/models/gemini:generateContent", handler.Uri!.ToString());
    }

    /// <summary>An override that is present but blank is what a half-configured environment looks
    /// like — Azure App Settings happily stores an empty string. That must degrade to the default
    /// endpoint, not take down the examiner with "configuration missing".</summary>
    [Fact]
    public async Task GenerateAsync_WithBlankEndpoint_FallsBackToTheConfiguredOne()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", endpoint: "");

        Assert.Equal("https://example.test/v1beta/models/gemini:generateContent", handler.Uri!.ToString());
    }

    /// <summary>Throws the scripted exceptions in order, then answers OK. Counts attempts.</summary>
    private sealed class FaultingHandler : HttpMessageHandler
    {
        private readonly Queue<Exception> _faults;

        public int Attempts { get; private set; }

        /// <summary>Fires as each attempt is served — lets a test cancel mid-flight.</summary>
        public Action? OnRequest;

        public FaultingHandler(params Exception[] faults) => _faults = new Queue<Exception>(faults);

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Attempts++;
            OnRequest?.Invoke();
            if (_faults.Count > 0)
                throw _faults.Dequeue();
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"candidates":[{"content":{"parts":[{"text":"{\"grade\":\"A\",\"score\":9}"}]}}]}
                    """),
            });
        }
    }

    /// <summary>The 45s HttpClient timeout surfaces as TaskCanceledException and a dropped
    /// connection as HttpRequestException. Both used to end the evaluation on first occurrence,
    /// losing a whole spoken session to a hiccup that clears in seconds.</summary>
    [Fact]
    public async Task GenerateAsync_RetriesTimeoutAndConnectionFault_ThenSucceeds()
    {
        var handler = new FaultingHandler(new TaskCanceledException("timeout"), new HttpRequestException("reset"));
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var result = await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""");

        Assert.Equal("A", result.Value.Grade);
        Assert.Equal(3, handler.Attempts);
    }

    /// <summary>A caller-requested cancellation is the same exception type as a timeout, so only the
    /// token tells them apart. Retrying an abandoned request spends on the paid endpoint for a user
    /// who is already gone.</summary>
    [Fact]
    public async Task GenerateAsync_CancelledDuringSend_IsNotRetried()
    {
        using var cts = new CancellationTokenSource();
        var handler = new FaultingHandler(new TaskCanceledException(), new TaskCanceledException());
        handler.OnRequest = cts.Cancel;
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", cts.Token));

        Assert.Equal(1, handler.Attempts);
    }

    [Fact]
    public async Task GenerateAsync_WithThinkingLevel_SendsIt()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", thinkingLevel: "high");

        using var sent = JsonDocument.Parse(handler.Body!);
        var thinking = sent.RootElement.GetProperty("generationConfig").GetProperty("thinkingConfig");
        Assert.Equal("high", thinking.GetProperty("thinkingLevel").GetString());
        Assert.False(thinking.TryGetProperty("thinkingBudget", out _));
    }

    /// <summary>A caller-chosen timeout marks a slow, expensive call (scoring). Retrying it would pay
    /// for a second generation and outlive the Functions host's 230s HTTP limit, so it is final.</summary>
    [Fact]
    public async Task GenerateAsync_WithTimeout_DoesNotRetryATimeout()
    {
        var handler = new FaultingHandler(new TaskCanceledException("timeout"));
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAsync<TimeoutException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", timeout: TimeSpan.FromSeconds(150)));

        Assert.Equal(1, handler.Attempts);
    }

    /// <summary>The per-call timeout must really stop a slow attempt: HttpClient.Timeout no longer
    /// does, because one client-wide number cannot serve a 45s examiner turn and a 150s scoring call.</summary>
    [Fact]
    public async Task GenerateAsync_WithTimeout_StopsASlowAttempt()
    {
        var handler = new HangingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        await Assert.ThrowsAsync<TimeoutException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}""", timeout: TimeSpan.FromMilliseconds(50)));

        Assert.Equal(1, handler.Attempts);
    }

    /// <summary>A cut-off answer must say why in the log: MAX_TOKENS is otherwise indistinguishable
    /// from the model simply returning bad JSON.</summary>
    [Fact]
    public async Task GenerateAsync_CutOffAnswer_ReportsFinishReason()
    {
        var handler = new BodyHandler("""
            {"candidates":[{"content":{"parts":[{"text":"{\"grade\":"}]},"finishReason":"MAX_TOKENS"}]}
            """);
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}"""));

        Assert.Contains("MAX_TOKENS", ex.Message);
    }

    /// <summary>A blocked answer comes back with no content at all — still a reason, not a crash.</summary>
    [Fact]
    public async Task GenerateAsync_BlockedAnswer_ReportsFinishReason()
    {
        var handler = new BodyHandler("""{"candidates":[{"finishReason":"SAFETY"}]}""");
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            client.GenerateAsync<Verdict>("sys", "user", """{"type":"OBJECT"}"""));

        Assert.Contains("SAFETY", ex.Message);
    }

    /// <summary>Answers 200 with a fixed body.</summary>
    private sealed class BodyHandler : HttpMessageHandler
    {
        private readonly string _body;

        public BodyHandler(string body) => _body = body;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct) =>
            Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(_body) });
    }

    /// <summary>Never answers on its own: waits on the token it was handed, the way a long
    /// generation does. Counts attempts.</summary>
    private sealed class HangingHandler : HttpMessageHandler
    {
        public int Attempts { get; private set; }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Attempts++;
            await Task.Delay(Timeout.Infinite, ct);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }
}
