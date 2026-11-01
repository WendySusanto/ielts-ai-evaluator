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

    /// <summary>The examiner turn runs on its own faster model; the model lives in the endpoint, so
    /// routing means passing a different endpoint (GeminiExaminerApiEndpoint).</summary>
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

    /// <summary>The budget depends on the model: flash-lite 400s on 0, and a 400 is never retried, so a
    /// hardcoded 0 would kill every examiner turn on those models.</summary>
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

    /// <summary>A typo'd App Setting falls back instead of throwing: 0 with no custom endpoint (the
    /// custom-endpoint case is tested below).</summary>
    [Fact]
    public async Task NextTurnAsync_WithUnparsableBudget_FallsBackToZero()
    {
        var (svc, gemini, userId, prompt) = Setup(examinerThinkingBudget: "one hundred");
        var request = new ExaminerTurnRequest(prompt.SpeakingPromptId, "Part1", ExaminerTurns(1));

        await svc.NextTurnAsync(userId, request);

        Assert.Equal(0, gemini.LastThinkingBudget);
    }

    /// <summary>Endpoint set but no budget yet: omit thinkingConfig (works on every model) rather than
    /// send 0, which some models reject with a never-retried 400.</summary>
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
}
