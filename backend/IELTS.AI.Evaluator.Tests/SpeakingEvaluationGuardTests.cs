using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class SpeakingEvaluationGuardTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiApiKey"] = "test-key",
            ["DailySpeakingQuota"] = "10",
        }).Build();

    private static (SpeakingEvaluationService svc, EvaluatorDbContext db, FakeGeminiApiClient gemini, User user, SpeakingPrompt prompt)
        Setup(string plan = "Free", int evaluationsToday = 0)
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "fake-uid", Email = "t@t.t", FullName = "T", AuthProvider = "Firebase", Plan = plan };
        var prompt = new SpeakingPrompt { SpeakingPromptId = Guid.NewGuid(), Part = "Part 1", Topic = "T", QuestionText = "Q", Description = "D", Preview = "P" };
        db.Users.Add(user);
        db.SpeakingPrompts.Add(prompt);
        for (var i = 0; i < evaluationsToday; i++)
        {
            db.SpeakingEvaluations.Add(new SpeakingEvaluation
            {
                SpeakingEvaluationId = Guid.NewGuid(),
                RawJson = "{}",
                Transcript = "a",
                User = user,
                SpeakingPrompt = prompt,
                AiModel = "m",
                CreatedAt = DateTime.UtcNow,
            });
        }
        db.SaveChanges();
        var gemini = new FakeGeminiApiClient();
        var svc = new SpeakingEvaluationService(gemini, db, NullLogger<SpeakingEvaluationService>.Instance, Config());
        return (svc, db, gemini, user, prompt);
    }

    private static SpeakingEvaluationRequestDto Request(SpeakingPrompt prompt, string transcript = "A spoken answer.") =>
        new() { SpeakingPromptId = prompt.SpeakingPromptId, Transcript = transcript, Question = "Q", Part = "Part 1", Cuepoints = "" };

    [Fact]
    public async Task FreeUser_UnderQuota_Succeeds()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 9);
        var result = await svc.EvaluateSpeakingAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task FreeUser_AtQuota_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 10);
        var result = await svc.EvaluateSpeakingAsync(user.UserId, Request(prompt));
        Assert.False(result.Success);
        Assert.Equal("Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task PremiumUser_AtQuota_Succeeds()
    {
        var (svc, _, _, user, prompt) = Setup(plan: "Premium", evaluationsToday: 10);
        var result = await svc.EvaluateSpeakingAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
    }

    [Fact]
    public async Task OversizedTranscript_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var result = await svc.EvaluateSpeakingAsync(user.UserId, Request(prompt, new string('a', 20_001)));
        Assert.False(result.Success);
        Assert.Equal("Transcript exceeds the maximum length of 20,000 characters.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }
}
