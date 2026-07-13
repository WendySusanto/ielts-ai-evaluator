using System.Text.Json;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace IELTS.AI.Evaluator.Tests;

// Reuses the generic FakeStructuredClient defined in WritingServiceTests.cs.
public class SpeakingServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["DailySpeakingQuota"] = "10",
        }).Build();

    // OverallBand (5.0) is deliberately different from the average of the three criteria
    // bands (6.0/6.5/7.0 -> 6.5) to prove the service recomputes it rather than trusting Gemini.
    private static SpeakingFeedback CannedFeedback() => new(
        OverallBand: 5.0m,
        Summary: "Generally fluent with natural pacing, though some grammar slips limit the score.",
        Criteria: new List<SpeakingCriterion>
        {
            new("FluencyCoherence", 6.0m, "Speaks with reasonable flow but hesitates when developing complex ideas.",
                new() { "\"Well... I think, um, technology is good for us.\"" },
                new() { "Reduce filler words like 'um' and 'well' when starting a response." }),
            new("LexicalResource", 6.5m, "Adequate range of everyday vocabulary with occasional repetition.",
                new() { "\"It's very good and very useful for people.\"" },
                new() { "Replace repeated 'very' with more precise intensifiers like 'extremely' or 'remarkably'." }),
            new("GrammaticalRangeAccuracy", 7.0m, "Good control of a mix of simple and complex structures.",
                new() { "\"If I had more time, I would have traveled more.\"" },
                new() { "Continue practicing mixed conditionals in spontaneous speech." }),
        });

    private static (SpeakingService svc, EvaluatorDbContext db, FakeStructuredClient gemini, User user, SpeakingPrompt prompt)
        Setup(string role = "Free", int sessionsToday = 0)
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "fake-uid", Email = "t@t.t", FullName = "T", Plan = role };
        var prompt = new SpeakingPrompt
        {
            SpeakingPromptId = Guid.NewGuid(),
            Topic = "Hometown",
            Description = "D",
            Preview = "P",
            Part = "Part1",
            QuestionText = "Tell me about your hometown.",
            Duration = 60,
            Level = "Academic",
        };
        db.Users.Add(user);
        db.SpeakingPrompts.Add(prompt);
        for (var i = 0; i < sessionsToday; i++)
        {
            db.SpeakingSessions.Add(new SpeakingSession
            {
                SpeakingSessionId = Guid.NewGuid(),
                UserId = user.UserId,
                SpeakingPromptId = prompt.SpeakingPromptId,
                Part = "Part1",
                Turns = "[]",
                OverallBand = 7,
                Feedback = "{}",
                AiModel = "m",
                CreatedAt = DateTime.UtcNow,
            });
        }
        db.SaveChanges();
        var gemini = new FakeStructuredClient(CannedFeedback());
        var svc = new SpeakingService(gemini, db, Config());
        return (svc, db, gemini, user, prompt);
    }

    private static SpeakingEvaluateRequest Request(SpeakingPrompt prompt, List<SpeakingTurn>? turns = null,
        PronunciationResult? pronunciation = null) =>
        new(prompt.SpeakingPromptId, "Part1", turns ?? new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            new("candidate", "I come from a small town near the coast, it's quiet and beautiful."),
        }, pronunciation);

    // Band is deliberately wrong/nonzero here to prove the service ignores client input and recomputes it.
    private static PronunciationResult Pronunciation(decimal pronunciationScore, decimal band = 0m,
        List<PronunciationWord>? words = null) =>
        new(band, pronunciationScore, 80m, 80m, 80m, 80m, words ?? new List<PronunciationWord>());

    [Fact]
    public async Task FreeUser_UnderQuota_Succeeds()
    {
        var (svc, _, gemini, user, prompt) = Setup(sessionsToday: 9);
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Equal(6.5m, result.OverallBand);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task FreeUser_AtQuota_ThrowsQuotaExceeded_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup(sessionsToday: 10);
        var ex = await Assert.ThrowsAsync<QuotaExceededException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt)));
        Assert.Equal("Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task PremiumUser_AtQuota_Succeeds()
    {
        var (svc, _, _, user, prompt) = Setup(role: "Premium", sessionsToday: 10);
        var result = await svc.EvaluateAsync(user.UserId, "Premium", Request(prompt));
        Assert.Equal(6.5m, result.OverallBand);
    }

    [Fact]
    public async Task TranscriptCap_CombinedAcrossCandidateTurns_ThrowsValidation_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("candidate", new string('a', 10_001)),
            new("candidate", new string('b', 10_001)), // combined 20,002 > cap
        };
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns)));
        Assert.Equal("Transcript exceeds the maximum length of 20,000 characters.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task ConversationCap_OversizedExaminerTurns_ThrowsValidation_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("candidate", "short answer"), // well under the candidate cap
            new("examiner", new string('x', 30_001)), // but all turns hit the paid Gemini prompt
        };
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns)));
        Assert.Equal("Conversation exceeds the maximum length of 30,000 characters.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_PersistsJsonbFeedback_AndReturnsTyped()
    {
        var (svc, db, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var row = await db.SpeakingSessions.SingleAsync(s => s.SpeakingSessionId == result.SpeakingSessionId);
        Assert.Contains("overallBand", row.Feedback);
        Assert.Contains("candidate", row.Turns);
        Assert.Null(row.Pronunciation);
        Assert.Equal(3, result.Feedback.Criteria.Count);
    }

    [Fact]
    public async Task Evaluate_OverallBand_IsAverageOfCriteria_RoundedToNearestHalf()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Equal(6.5m, result.OverallBand);
        Assert.Equal(6.5m, result.Feedback.OverallBand);
    }

    [Fact]
    public async Task Evaluate_WithPronunciation_MergesBandIntoOverall()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: Pronunciation(72m)));

        // Gemini 6.0/6.5/7.0 + PA band 6.5 (72/100*9 = 6.48 -> 6.5) averaged -> 6.5.
        Assert.Equal(6.5m, result.OverallBand);
    }

    [Fact]
    public async Task Evaluate_WithPronunciation_IgnoresClientSuppliedBand()
    {
        var (svc, db, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free",
            Request(prompt, pronunciation: Pronunciation(pronunciationScore: 50m, band: 9m)));

        var row = await db.SpeakingSessions.SingleAsync(s => s.SpeakingSessionId == result.SpeakingSessionId);
        var stored = JsonSerializer.Deserialize<PronunciationResult>(row.Pronunciation!, new JsonSerializerOptions(JsonSerializerDefaults.Web));
        Assert.Equal(4.5m, stored!.Band);
    }

    [Theory]
    [InlineData(-1, 80, 80, 80, 80)]
    [InlineData(101, 80, 80, 80, 80)]
    [InlineData(80, -1, 80, 80, 80)]
    [InlineData(80, 80, 101, 80, 80)]
    [InlineData(80, 80, 80, -1, 80)]
    [InlineData(80, 80, 80, 80, 101)]
    public async Task Evaluate_PronunciationScoreOutOfRange_ThrowsValidation(
        decimal pronunciationScore, decimal accuracyScore, decimal fluencyScore, decimal prosodyScore, decimal completenessScore)
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var pronunciation = new PronunciationResult(0m, pronunciationScore, accuracyScore, fluencyScore, prosodyScore, completenessScore, new List<PronunciationWord>());
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: pronunciation)));
        Assert.Equal("Invalid pronunciation assessment data.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_PronunciationWordsOverCap_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var words = Enumerable.Range(0, 401).Select(i => new PronunciationWord($"w{i}", 80m, "None")).ToList();
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: Pronunciation(72m, words: words))));
        Assert.Equal("Invalid pronunciation assessment data.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task GetDetail_WithPronunciation_RoundTripsParsedObject()
    {
        var (svc, _, _, user, prompt) = Setup();
        var words = new List<PronunciationWord> { new("hello", 95m, "None") };
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: Pronunciation(72m, words: words)));

        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        Assert.NotNull(detail.Pronunciation);
        Assert.Equal(6.5m, detail.Pronunciation!.Band);
        Assert.Equal(72m, detail.Pronunciation.PronunciationScore);
        Assert.Single(detail.Pronunciation.Words);
        Assert.Equal("hello", detail.Pronunciation.Words[0].Word);
    }

    [Fact]
    public async Task GetDetail_WithoutPronunciation_PronunciationStaysNull()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        Assert.Null(detail.Pronunciation);
    }

    [Fact]
    public async Task GetDetail_NotOwner_ThrowsNotFound()
    {
        var (svc, db, _, owner, prompt) = Setup();
        var sessionId = Guid.NewGuid();
        db.SpeakingSessions.Add(new SpeakingSession
        {
            SpeakingSessionId = sessionId,
            UserId = owner.UserId,
            SpeakingPromptId = prompt.SpeakingPromptId,
            Part = "Part1",
            Turns = JsonSerializer.Serialize(new List<SpeakingTurn> { new("candidate", "a") }, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            OverallBand = 6.5m,
            Feedback = JsonSerializer.Serialize(CannedFeedback(), new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            AiModel = "m",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var otherUserId = Guid.NewGuid();
        var ex = await Assert.ThrowsAsync<NotFoundException>(() => svc.GetDetailAsync(otherUserId, sessionId));
        Assert.Equal("Speaking session not found.", ex.Message);

        var ownerResult = await svc.GetDetailAsync(owner.UserId, sessionId);
        Assert.Equal(sessionId, ownerResult.SpeakingSessionId);
        Assert.Null(ownerResult.Pronunciation);
    }

    [Fact]
    public async Task Evaluate_UnknownPrompt_ThrowsNotFound()
    {
        var (svc, _, gemini, user, _) = Setup();
        var request = new SpeakingEvaluateRequest(Guid.NewGuid(), "Part1", new List<SpeakingTurn> { new("candidate", "a") });
        var ex = await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", request));
        Assert.Equal("Speaking prompt not found.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_EmptyTurns_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, new List<SpeakingTurn>())));
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_NoCandidateTurns_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn> { new("examiner", "Tell me about your hometown.") };
        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns)));
        Assert.Equal(0, gemini.Calls);
    }

    // ponytail: the hand-authored Gemini schema JSON literal is exactly the kind of thing that
    // silently breaks with a typo'd brace/comma; this is the one runnable check for it.
    [Fact]
    public void GeminiSchema_IsValidJson_AndMirrorsSpeakingFeedback()
    {
        using var doc = JsonDocument.Parse(SpeakingFeedbackPrompts.GeminiSchema);
        var root = doc.RootElement;
        Assert.Equal("OBJECT", root.GetProperty("type").GetString());

        var required = root.GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "overallBand", "summary", "criteria" }, required);

        var criteria = root.GetProperty("properties").GetProperty("criteria");
        Assert.Equal(3, criteria.GetProperty("minItems").GetInt32());
        Assert.Equal(3, criteria.GetProperty("maxItems").GetInt32());
        var criterionRequired = criteria.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "name", "band", "justification", "examples", "improvements" }, criterionRequired);
    }
}
