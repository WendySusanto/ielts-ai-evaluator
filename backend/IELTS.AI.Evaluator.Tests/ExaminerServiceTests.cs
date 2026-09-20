using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Tests;

// Reuses the generic FakeStructuredClient defined in WritingServiceTests.cs.
public class ExaminerServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static (ExaminerService svc, FakeStructuredClient gemini, Guid userId, SpeakingPrompt prompt) Setup(
        string part = "Part1", string? cuepoints = null)
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
        var svc = new ExaminerService(gemini, db);
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
}
