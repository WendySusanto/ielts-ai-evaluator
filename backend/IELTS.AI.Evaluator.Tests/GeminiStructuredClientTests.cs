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
