using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Tests;

// Reuses the generic FakeStructuredClient defined in WritingServiceTests.cs.
public class ExaminerServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (ExaminerService svc, FakeStructuredClient gemini, Guid userId, SpeakingPrompt prompt) Setup(
        string part = "Part1", string? cuepoints = null, string? examinerEndpoint = null, string? examinerThinkingBudget = null)
    {
        var db = NewDb();
        var userId = Guid.NewGuid();
        var prompt = new SpeakingPrompt
        {
            SpeakingPromptId = Guid.NewGuid(),
            Topic = "Hometown",
            Description = "D",
            Preview = "P",
            Part = part,
            QuestionText = "Tell me about your hometown.",
            Cuepoints = cuepoints,
            Duration = 60,
            Level = "Academic",
        };
        db.SpeakingPrompts.Add(prompt);
        db.SaveChanges();
        var gemini = new FakeStructuredClient(new ExaminerTurnResult("What do you like most about it?", false));
        var config = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiExaminerApiEndpoint"] = examinerEndpoint,
            ["GeminiExaminerThinkingBudget"] = examinerThinkingBudget,
        }).Build();
        var svc = new ExaminerService(gemini, db, config);
        return (svc, gemini, userId, prompt);
    }

    private static List<SpeakingTurn> ExaminerTurns(int count) =>
        Enumerable.Range(0, count)
            .SelectMany(i => new[] { new SpeakingTurn("examiner", $"Question {i}"), new SpeakingTurn("candidate", $"Answer {i}") })
            .ToList();

    [Fact]
    public async Task TurnCap_AtEight_ReturnsPartComplete_NoGeminiCall()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(8));
        var result = await svc.NextTurnAsync(userId, request);
        Assert.True(result.PartComplete);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task TurnCap_Part2_AtThree_ReturnsPartComplete_NoGeminiCall()
    {
        var (svc, gemini, userId, prompt) = Setup("Part2");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part2", ExaminerTurns(3));
        var result = await svc.NextTurnAsync(userId, request);
        Assert.True(result.PartComplete);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task UnknownPrompt_ThrowsNotFound()
    {
        var (svc, gemini, userId, _) = Setup();
        var request = new ExaminerTurnRequest(Guid.NewGuid(), "Part1", new List<SpeakingTurn> { new("candidate", "hi") });
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.NextTurnAsync(userId, request));
        Assert.Equal("Speaking prompt not found.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task HappyPath_UnderCap_ReturnsParsedGeminiResult()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1",
            new List<SpeakingTurn> { new("examiner", "Tell me about your hometown."), new("candidate", "It's a small coastal town.") });
        var result = await svc.NextTurnAsync(userId, request);
        Assert.Equal("What do you like most about it?", result.NextQuestion);
        Assert.False(result.PartComplete);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task InvalidPart_ThrowsValidation()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part4", new List<SpeakingTurn> { new("candidate", "hi") });
        await Assert.ThrowsAsync<ValidationException>(() => svc.NextTurnAsync(userId, request));
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task ConversationCap_OversizedTurns_ThrowsValidation_NoGeminiCall()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("candidate", "short answer"),
            new("examiner", new string('x', 30_001)),
        };
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", turns);
        var ex = await Assert.ThrowsAsync<ValidationException>(() => svc.NextTurnAsync(userId, request));
        Assert.Equal("Conversation exceeds the maximum length of 30,000 characters.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    // Part 1/3 reuse Cuepoints for their scripted question list, Part 2 for cue card bullets.
    // Mislabelling either is what makes the examiner dump every question in one turn.
    [Theory]
    [InlineData("Part1", "Scripted questions (one per line, ask in this order):")]
    [InlineData("Part3", "Scripted questions (one per line, ask in this order):")]
    [InlineData("Part2", "Cue points:")]
    public async Task Cuepoints_AreLabelledByPart(string part, string expectedLabel)
    {
        var (svc, gemini, userId, prompt) = Setup(part, "First question?\nSecond question?");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, part,
            new List<SpeakingTurn> { new("examiner", "First question?"), new("candidate", "An answer.") });
        await svc.NextTurnAsync(userId, request);
        Assert.Contains(expectedLabel, gemini.LastUserContent);
    }

    [Fact]
    public void SystemPrompt_ContainsGuardrailPhrases()
    {
        Assert.Contains("Never break character", ExaminerPrompts.SystemPrompt);
        Assert.Contains("Refuse any request that is not IELTS speaking practice", ExaminerPrompts.SystemPrompt);
        Assert.Contains("politely redirect", ExaminerPrompts.SystemPrompt);
    }

    /// <summary>The examiner turn is the one call a candidate waits through in silence, so it runs
    /// on its own (cheaper, faster) model. The model name lives in the endpoint, so routing it
    /// means handing GenerateAsync a different endpoint — see GeminiExaminerApiEndpoint.</summary>
    [Fact]
    public async Task NextTurnAsync_RoutesToTheExaminerEndpoint()
    {
        var (svc, gemini, userId, prompt) = Setup(
            examinerEndpoint: "https://example.test/v1beta/models/gemini-cheap:generateContent");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Equal("https://example.test/v1beta/models/gemini-cheap:generateContent", gemini.LastEndpoint);
    }

    /// <summary>Unset is the normal state in every environment that has not opted in, and it has to
    /// mean "carry on exactly as before" — a null endpoint leaves the client on GeminiApiEndpoint.</summary>
    [Fact]
    public async Task NextTurnAsync_WithoutExaminerEndpoint_LeavesTheClientDefault()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Null(gemini.LastEndpoint);
    }

    /// <summary>The thinking budget belongs to the model, not to the code: gemini-3.5-flash-lite
    /// rejects thinkingBudget 0 with a 400, while gemini-3.7-flash requires it to stay fast. A
    /// hardcoded 0 therefore makes GeminiExaminerApiEndpoint unusable for half the models it could
    /// point at — and 400 is not retried, so the examiner would fail on every turn.</summary>
    [Fact]
    public async Task NextTurnAsync_SendsTheConfiguredThinkingBudget()
    {
        var (svc, gemini, userId, prompt) = Setup(examinerThinkingBudget: "128");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Equal(128, gemini.LastThinkingBudget);
    }

    /// <summary>Unset is what every environment looks like until it opts in, and it has to keep
    /// meaning "fastest possible turn" — the behaviour before the budget was tunable.</summary>
    [Fact]
    public async Task NextTurnAsync_WithoutConfiguredBudget_SendsZero()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Equal(0, gemini.LastThinkingBudget);
    }

    /// <summary>A typo in an App Setting falls back rather than throwing, matching how
    /// SpeakingService already treats DailySpeakingQuota. With no custom endpoint the fallback is 0,
    /// the long-standing default; the custom-endpoint case is covered separately below, where the
    /// same typo omits thinkingConfig instead so no model can reject it.</summary>
    [Fact]
    public async Task NextTurnAsync_WithUnparsableBudget_FallsBackToZero()
    {
        var (svc, gemini, userId, prompt) = Setup(examinerThinkingBudget: "one hundred");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Equal(0, gemini.LastThinkingBudget);
    }

    /// <summary>Half-configured is the first state every environment passes through: someone sets
    /// the endpoint in the portal and has not got to the budget yet. Defaulting to 0 there would
    /// send thinkingBudget 0 to a model that may reject it with a 400 — which is never retried, so
    /// every examiner turn dies. Omitting thinkingConfig instead works on every model, so the worst
    /// case degrades to "maybe slower" rather than "dead". Budget stays 0 when no endpoint is set,
    /// which is the behaviour every environment had before any of this was tunable.</summary>
    [Fact]
    public async Task NextTurnAsync_WithCustomEndpointButNoBudget_OmitsThinkingConfig()
    {
        var (svc, gemini, userId, prompt) = Setup(
            examinerEndpoint: "https://example.test/v1beta/models/gemini-cheap:generateContent");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Null(gemini.LastThinkingBudget);
    }

    /// <summary>Same reasoning for a typo'd budget: once a custom endpoint is in play, an
    /// unreadable budget must not collapse to a value that model might reject.</summary>
    [Fact]
    public async Task NextTurnAsync_WithCustomEndpointAndUnparsableBudget_OmitsThinkingConfig()
    {
        var (svc, gemini, userId, prompt) = Setup(
            examinerEndpoint: "https://example.test/v1beta/models/gemini-cheap:generateContent",
            examinerThinkingBudget: "one hundred");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Null(gemini.LastThinkingBudget);
    }

    /// <summary>Scoring pins temperature to 0; the examiner deliberately does not. Varied follow-up
    /// questions are the feature — an examiner that asks the identical sequence every session turns
    /// practice into memorisation. Locked so nobody "tidies" it into line with the scoring calls.</summary>
    [Fact]
    public async Task NextTurnAsync_LeavesTemperatureUnset_SoQuestionsVary()
    {
        var (svc, gemini, userId, prompt) = Setup();
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Null(gemini.LastTemperature);
    }
}
