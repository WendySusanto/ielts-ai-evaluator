using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class EssayEvaluationGuardTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiApiKey"] = "test-key",
            ["DailyWritingQuota"] = "10",
        }).Build();

    private static (EssayEvaluationService svc, EvaluatorDbContext db, FakeGeminiApiClient gemini, User user, WritingPrompt prompt)
        Setup(string plan = "Free", int evaluationsToday = 0)
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "fake-uid", Email = "t@t.t", FullName = "T", AuthProvider = "Firebase", Plan = plan };
        var prompt = new WritingPrompt { WritingPromptId = Guid.NewGuid(), TaskType = "Task 2", Topic = "T", QuestionText = "Q", Description = "D", Preview = "P", QuestionType = "Line Graph" };
        db.Users.Add(user);
        db.WritingPrompts.Add(prompt);
        for (var i = 0; i < evaluationsToday; i++)
        {
            db.EssayEvaluations.Add(new EssayEvaluation
            {
                EssayEvaluationId = Guid.NewGuid(),
                RawJson = "{}",
                UserAnswer = "a",
                User = user,
                WritingPrompt = prompt,
                AiModel = "m",
                CreatedAt = DateTime.UtcNow,
            });
        }
        db.SaveChanges();
        var gemini = new FakeGeminiApiClient();
        var svc = new EssayEvaluationService(gemini, db, NullLogger<EssayEvaluationService>.Instance, Config());
        return (svc, db, gemini, user, prompt);
    }

    private static EssayEvaluationRequestDto Request(WritingPrompt prompt, string answer = "A reasonable essay answer.") =>
        new() { WritingPromptId = prompt.WritingPromptId, UserAnswer = answer, Question = prompt.QuestionText, TaskType = prompt.TaskType, ImageDescription = "" };

    [Fact]
    public async Task FreeUser_UnderQuota_Succeeds()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 9);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task FreeUser_AtQuota_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 10);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.False(result.Success);
        Assert.Equal("Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task PremiumUser_AtQuota_Succeeds()
    {
        var (svc, _, _, user, prompt) = Setup(plan: "Premium", evaluationsToday: 10);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
    }

    [Fact]
    public async Task OversizedEssay_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt, new string('a', 10_001)));
        Assert.False(result.Success);
        Assert.Equal("Essay exceeds the maximum length of 10,000 characters.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }
}
