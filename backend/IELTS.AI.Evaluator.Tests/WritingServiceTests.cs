using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Tests;

/// <summary>Generic fake for IGeminiStructuredClient: serializes the canned object then
/// deserializes as T, so it plugs into any GenerateAsync&lt;T&gt; call. Counts calls.</summary>
public class FakeStructuredClient : IGeminiStructuredClient
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);
    private readonly object _canned;

    public int Calls { get; private set; }
    public string? LastUserContent { get; private set; }

    public FakeStructuredClient(object canned) => _canned = canned;

    public Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson)
    {
        Calls++;
        LastUserContent = userContent;
        var json = JsonSerializer.Serialize(_canned, CamelCase);
        var value = JsonSerializer.Deserialize<T>(json, CamelCase)!;
        return Task.FromResult(new GeminiResult<T>(value, "gemini-test", 100, 200));
    }
}

public class WritingServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DailyWritingQuota"] = "10",
        }).Build();

    private static WritingFeedback CannedFeedback() => new(
        OverallBand: 7.0m,
        Summary: "A well-organized essay with a clear position, though some grammar slips hold it back.",
        Criteria: new List<WritingCriterion>
        {
            new("TaskResponse", 7.0m, "Addresses all parts of the prompt with a clear position.",
                new() { "\"In my opinion, technology has done more good than harm.\"" },
                new() { "Develop the counter-argument further before dismissing it." }),
            new("CoherenceCohesion", 7.0m, "Ideas progress logically with appropriate linking words.",
                new() { "\"Furthermore, this trend is visible in developing countries too.\"" },
                new() { "Vary cohesive devices beyond 'furthermore' and 'however'." }),
            new("LexicalResource", 6.5m, "Reasonably wide vocabulary with occasional imprecise word choice.",
                new() { "\"People can communicate easily via internet.\"" },
                new() { "Replace 'via internet' with 'over the internet' for natural collocation." }),
            new("GrammaticalRangeAccuracy", 7.0m, "Good range of structures with minor recurring errors.",
                new() { "\"If people will use social media wisely, they can benefit a lot.\"" },
                new() { "Use present simple after 'if' in first conditionals: 'If people use...'" }),
        },
        Errors: new List<WritingError>
        {
            new("If people will use social media wisely", "If people use social media wisely",
                "First conditional: present simple in the if-clause, not 'will'."),
        },
        VocabularyUpgrades: new List<VocabularyUpgrade>
        {
            new("via internet", "over the internet", "\"People can communicate easily via internet.\""),
        },
        ImprovedExcerpt: "In my opinion, technology has done more good than harm, particularly in education and communication.");

    private static (WritingService svc, EvaluatorDbContext db, FakeStructuredClient gemini, User user, WritingPrompt prompt)
        Setup(string role = "Free", int evaluationsToday = 0)
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "fake-uid", Email = "t@t.t", FullName = "T", Plan = role };
        var prompt = new WritingPrompt
        {
            WritingPromptId = Guid.NewGuid(),
            TaskType = "Task2",
            Topic = "Technology",
            QuestionText = "Does technology do more good than harm?",
            Description = "D",
            Preview = "P",
            QuestionType = "Opinion",
        };
        db.Users.Add(user);
        db.WritingPrompts.Add(prompt);
        for (var i = 0; i < evaluationsToday; i++)
        {
            db.WritingEvaluations.Add(new WritingEvaluation
            {
                WritingEvaluationId = Guid.NewGuid(),
                UserId = user.UserId,
                WritingPromptId = prompt.WritingPromptId,
                EssayText = "a",
                WordCount = 1,
                OverallBand = 7,
                Feedback = "{}",
                AiModel = "m",
                CreatedAt = DateTime.UtcNow,
            });
        }
        db.SaveChanges();
        var gemini = new FakeStructuredClient(CannedFeedback());
        var svc = new WritingService(gemini, db, Config());
        return (svc, db, gemini, user, prompt);
    }

    private static WritingEvaluateRequest Request(WritingPrompt prompt, string essay = "A reasonable essay answer about technology.") =>
        new(prompt.WritingPromptId, essay);

    [Fact]
    public async Task FreeUser_UnderQuota_Succeeds()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 9);
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Equal(7.0m, result.OverallBand);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task FreeUser_AtQuota_ThrowsQuotaExceeded_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 10);
        var ex = await Assert.ThrowsAsync<QuotaExceededException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt)));
        Assert.Equal("Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task PremiumUser_AtQuota_Succeeds()
    {
        var (svc, _, _, user, prompt) = Setup(role: "Premium", evaluationsToday: 10);
        var result = await svc.EvaluateAsync(user.UserId, "Premium", Request(prompt));
        Assert.Equal(7.0m, result.OverallBand);
    }

    [Fact]
    public async Task OversizedEssay_ThrowsValidation_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, new string('a', 10_001))));
        Assert.Equal("Essay exceeds the maximum length of 10,000 characters.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_PersistsJsonbFeedback_AndReturnsTyped()
    {
        var (svc, db, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var row = await db.WritingEvaluations.SingleAsync(e => e.WritingEvaluationId == result.WritingEvaluationId);
        Assert.Contains("overallBand", row.Feedback);
        Assert.True(row.WordCount > 0);
        Assert.Equal(7.0m, result.Feedback.OverallBand);
        Assert.Equal(4, result.Feedback.Criteria.Count);
    }

    [Fact]
    public async Task GetDetail_NotOwner_ThrowsNotFound()
    {
        var (svc, db, _, owner, prompt) = Setup();
        var evaluationId = Guid.NewGuid();
        db.WritingEvaluations.Add(new WritingEvaluation
        {
            WritingEvaluationId = evaluationId,
            UserId = owner.UserId,
            WritingPromptId = prompt.WritingPromptId,
            EssayText = "a",
            WordCount = 1,
            OverallBand = 7,
            Feedback = JsonSerializer.Serialize(CannedFeedback(), new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            AiModel = "m",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var otherUserId = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.GetDetailAsync(otherUserId, evaluationId));
        Assert.Equal("Evaluation not found.", ex.Message);

        var ownerResult = await svc.GetDetailAsync(owner.UserId, evaluationId);
        Assert.Equal(evaluationId, ownerResult.WritingEvaluationId);
    }

    [Fact]
    public async Task Evaluate_UnknownPrompt_ThrowsNotFound()
    {
        var (svc, _, gemini, user, _) = Setup();
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", new WritingEvaluateRequest(Guid.NewGuid(), "A reasonable essay.")));
        Assert.Equal("Writing prompt not found.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_EmptyEssay_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, "   ")));
        Assert.Equal(0, gemini.Calls);
    }

    // ponytail: the hand-authored ~100-line Gemini schema JSON literal is exactly the kind of
    // thing that silently breaks with a typo'd brace/comma; this is the one runnable check for it.
    [Fact]
    public void GeminiSchema_IsValidJson_AndMirrorsWritingFeedback()
    {
        using var doc = JsonDocument.Parse(WritingFeedbackPrompts.GeminiSchema);
        var root = doc.RootElement;
        Assert.Equal("OBJECT", root.GetProperty("type").GetString());

        var required = root.GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "overallBand", "summary", "criteria", "errors", "vocabularyUpgrades", "improvedExcerpt" }, required);

        var criteria = root.GetProperty("properties").GetProperty("criteria");
        Assert.Equal(4, criteria.GetProperty("minItems").GetInt32());
        Assert.Equal(4, criteria.GetProperty("maxItems").GetInt32());
        var criterionRequired = criteria.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "name", "band", "justification", "examples", "improvements" }, criterionRequired);

        var errorRequired = root.GetProperty("properties").GetProperty("errors").GetProperty("items").GetProperty("required")
            .EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "quote", "correction", "rule" }, errorRequired);

        var upgradeRequired = root.GetProperty("properties").GetProperty("vocabularyUpgrades").GetProperty("items").GetProperty("required")
            .EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "original", "upgrade", "context" }, upgradeRequired);
    }
}
