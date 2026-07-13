using System.Net;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Tests;

public class SpeechTokenServiceTests
{
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request;
        public HttpStatusCode StatusCode = HttpStatusCode.OK;
        public string ResponseBody = "fake-token";

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Request = request;
            return Task.FromResult(new HttpResponseMessage(StatusCode)
            {
                Content = new StringContent(ResponseBody),
            });
        }
    }

    private static IConfiguration Config(string? key = "sub-key", string? region = "eastus", string? voice = null)
    {
        var values = new Dictionary<string, string?>();
        if (key is not null) values["AzureSpeechKey"] = key;
        if (region is not null) values["AzureSpeechRegion"] = region;
        if (voice is not null) values["ExaminerVoice"] = voice;
        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    [Fact]
    public async Task GetTokenAsync_Success_ReturnsTokenRegionAndDefaultVoice()
    {
        var handler = new CapturingHandler { ResponseBody = "issued-token-123" };
        var service = new SpeechTokenService(new HttpClient(handler), Config());

        var dto = await service.GetTokenAsync();

        Assert.Equal("issued-token-123", dto.Token);
        Assert.Equal("eastus", dto.Region);
        Assert.Equal("en-GB-RyanNeural", dto.Voice);

        Assert.Equal(HttpMethod.Post, handler.Request!.Method);
        Assert.Equal("https://eastus.api.cognitive.microsoft.com/sts/v1.0/issueToken", handler.Request.RequestUri!.ToString());
        Assert.Equal("sub-key", handler.Request.Headers.GetValues("Ocp-Apim-Subscription-Key").Single());
    }

    [Fact]
    public async Task GetTokenAsync_ConfiguredVoice_ReturnsConfiguredVoice()
    {
        var handler = new CapturingHandler();
        var service = new SpeechTokenService(new HttpClient(handler), Config(voice: "en-US-JennyNeural"));

        var dto = await service.GetTokenAsync();

        Assert.Equal("en-US-JennyNeural", dto.Voice);
    }

    [Fact]
    public async Task GetTokenAsync_MissingKey_ThrowsInvalidOperationException()
    {
        var handler = new CapturingHandler();
        var service = new SpeechTokenService(new HttpClient(handler), Config(key: null));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetTokenAsync());
    }

    [Fact]
    public async Task GetTokenAsync_MissingRegion_ThrowsInvalidOperationException()
    {
        var handler = new CapturingHandler();
        var service = new SpeechTokenService(new HttpClient(handler), Config(region: null));

        await Assert.ThrowsAsync<InvalidOperationException>(() => service.GetTokenAsync());
    }

    [Fact]
    public async Task GetTokenAsync_NonSuccessFromAzure_ThrowsHttpRequestExceptionWithoutKeyInMessage()
    {
        var handler = new CapturingHandler { StatusCode = HttpStatusCode.Unauthorized, ResponseBody = "Access denied" };
        var service = new SpeechTokenService(new HttpClient(handler), Config(key: "super-secret-key"));

        var ex = await Assert.ThrowsAsync<HttpRequestException>(() => service.GetTokenAsync());

        Assert.DoesNotContain("super-secret-key", ex.Message);
    }
}
