using IELTS.AI.Evaluator.Functions.Services;

namespace IELTS.AI.Evaluator.Tests;

/// <summary>Returns a minimal valid Gemini response so services can be tested without the network.</summary>
public class FakeGeminiApiClient : IGeminiApiClient
{
    public const string CannedResponse =
        """
        {"candidates":[{"content":{"parts":[{"text":"{\"overallBand\": 6.5}"}]}}],"modelVersion":"fake-model","usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":1}}
        """;

    public int Calls { get; private set; }

    public Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey)
    {
        Calls++;
        return Task.FromResult(CannedResponse);
    }

    public Task<string> EvaluateSpeakingAsync(string transcript, string question, string? cuepoints, string? part, string apiKey)
    {
        Calls++;
        return Task.FromResult(CannedResponse);
    }
}
