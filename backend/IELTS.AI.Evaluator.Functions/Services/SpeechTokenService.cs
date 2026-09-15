using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Functions.Services;

public record SpeechTokenDto(string Token, string Region, string Voice);

public interface ISpeechTokenService
{
    Task<SpeechTokenDto> GetTokenAsync(CancellationToken ct = default);
}

public class SpeechTokenService : ISpeechTokenService
{
    private const string DefaultVoice = "en-GB-RyanNeural";

    private readonly HttpClient _http;
    private readonly IConfiguration _config;

    public SpeechTokenService(HttpClient http, IConfiguration config)
    {
        _http = http;
        _config = config;
    }

    public async Task<SpeechTokenDto> GetTokenAsync(CancellationToken ct = default)
    {
        var key = _config["AzureSpeechKey"];
        var region = _config["AzureSpeechRegion"];
        if (string.IsNullOrWhiteSpace(key) || string.IsNullOrWhiteSpace(region))
            throw new InvalidOperationException("Speech service not configured.");

        var voice = _config["ExaminerVoice"];
        if (string.IsNullOrWhiteSpace(voice)) voice = DefaultVoice;

        using var request = new HttpRequestMessage(HttpMethod.Post,
            $"https://{region}.api.cognitive.microsoft.com/sts/v1.0/issueToken");
        request.Headers.Add("Ocp-Apim-Subscription-Key", key);

        using var response = await _http.SendAsync(request, ct);
        var body = await response.Content.ReadAsStringAsync(ct);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException($"Azure Speech token request failed with status {(int)response.StatusCode}");

        return new SpeechTokenDto(body, region, voice);
    }
}
