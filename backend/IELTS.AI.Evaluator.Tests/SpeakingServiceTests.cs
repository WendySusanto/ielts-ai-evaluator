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
                new() { "Continue practicing mixed conditionals in spontaneous speech." },
                new() { new("temperature become hotter every year", "temperatures are getting hotter every year",
                    "Plural subject, and the present continuous for an ongoing change.") }),
        },
        Vocabulary: new List<SpeakingVocabularyUpgrade>
        {
            new("exacerbate", "C1", "make worse", "the smoke make the air worse",
                "the smoke exacerbates air pollution"),
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

    /// <summary>Lexical is a second client-supplied transcript rendered verbatim into the same paid
    /// call, so a cap that only counted Text would let a caller walk straight past it.</summary>
    [Fact]
    public async Task ConversationCap_OversizedLexical_ThrowsValidation_NoGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("candidate", "short answer", new string('x', 30_001)),
        };
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns)));
        Assert.Equal("Conversation exceeds the maximum length of 30,000 characters.", ex.Message);
        Assert.Equal(0, gemini.Calls);
    }

    // The display transcript is auto-punctuated and tidied, which flatters grammar and erases every
    // hesitation. These three pin the raw rendering that lets Gemini see past it.
    [Fact]
    public async Task Evaluate_WithLexicalTurns_SendsRawRecognitionAlongsideDisplayText()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            new("candidate", "I come from a small town. It's quiet.",
                "i come from a uh [pause 2.4s] small town it's quiet"),
        };
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns));

        // Both renderings reach the prompt — the point is that Gemini can compare them.
        Assert.Contains("Candidate: I come from a small town. It's quiet.", gemini.LastUserContent);
        Assert.Contains("Candidate: i come from a uh [pause 2.4s] small town it's quiet", gemini.LastUserContent);
        Assert.Contains("Raw recognition", gemini.LastUserContent);
    }

    /// <summary>Examiner turns are synthesized speech, never recognized, so they have no raw form and
    /// must not be invented into one.</summary>
    [Fact]
    public async Task Evaluate_RawRecognitionBlock_ExcludesExaminerTurns()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            new("candidate", "A small town.", "a small town"),
        };
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns));

        var content = gemini.LastUserContent!;
        var rawBlock = content[content.IndexOf("Raw recognition", StringComparison.Ordinal)..];
        Assert.DoesNotContain("Examiner", rawBlock);
    }

    /// <summary>A typed session has no recognition at all; an empty heading would read to the model
    /// as the candidate having said nothing.</summary>
    [Fact]
    public async Task Evaluate_WithoutLexicalTurns_OmitsRawRecognitionBlock()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.DoesNotContain("Raw recognition", gemini.LastUserContent);
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

    // Gemini is text-only, so the Azure fluency score reaching the prompt is the only thing that lets it
    // mark hesitation and pacing at all. These two are the runnable check that the line is still emitted.
    [Fact]
    public async Task Evaluate_WithPronunciation_SendsMeasuredFluencyToGemini()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        // Pronunciation() supplies fluencyScore 80 alongside the 72 overall pronunciation score.
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: Pronunciation(72m)));
        Assert.Contains(
            "Measured speech fluency (0-100, from pause length, pause placement and speech rate): 80",
            gemini.LastUserContent);
    }

    [Fact]
    public async Task Evaluate_WithoutPronunciation_TellsGeminiFluencyIsUnmeasured()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Contains("Measured speech fluency: not available", gemini.LastUserContent);
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
    public async Task Evaluate_PronunciationWordsNull_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        // NRT isn't runtime-enforced through System.Text.Json: "words": null on the wire deserializes to null.
        var pronunciation = Pronunciation(72m) with { Words = null! };
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, pronunciation: pronunciation)));
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

    /// <summary>The feedback screen draws the pause bars straight from this field, so it has to
    /// survive the jsonb round trip — and stay null for sessions recorded before it existed.</summary>
    [Fact]
    public async Task GetDetail_RoundTripsLexical_AndLeavesTypedTurnsNull()
    {
        var (svc, _, _, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            new("candidate", "A small town.", "a [pause 2.4s] small town"),
            new("candidate", "I typed this one."),
        };
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns));

        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        Assert.Null(detail.Turns[0].Lexical);
        Assert.Equal("a [pause 2.4s] small town", detail.Turns[1].Lexical);
        Assert.Null(detail.Turns[2].Lexical);
    }

    /// <summary>The rewrites and vocabulary are what the feedback screen renders under "From your
    /// answer" and in the vocabulary card, so they have to survive the jsonb round trip intact.</summary>
    [Fact]
    public async Task GetDetail_RoundTripsRewritesAndVocabulary()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        var rewrite = Assert.Single(detail.Feedback.Criteria[2].Rewrites!);
        Assert.Equal("temperatures are getting hotter every year", rewrite.Improved);
        var upgrade = Assert.Single(detail.Feedback.Vocabulary!);
        Assert.Equal("exacerbate", upgrade.Phrase);
        Assert.Equal("C1", upgrade.Level);
    }

    /// <summary>Feedback marked before rewrites and vocabulary existed has neither key in its jsonb.
    /// The history page must still open it, not throw on deserialization.</summary>
    [Fact]
    public async Task GetDetail_FeedbackFromBeforeRewrites_StillOpens()
    {
        var (svc, db, _, user, prompt) = Setup();
        var sessionId = Guid.NewGuid();
        db.SpeakingSessions.Add(new SpeakingSession
        {
            SpeakingSessionId = sessionId,
            UserId = user.UserId,
            SpeakingPromptId = prompt.SpeakingPromptId,
            Part = "Part1",
            Turns = """[{"role":"candidate","text":"a"}]""",
            OverallBand = 6.0m,
            // Verbatim shape of a row written before this change: no rewrites, no vocabulary.
            Feedback = """
                {"overallBand":6.0,"summary":"s","criteria":[
                  {"name":"FluencyCoherence","band":6.0,"justification":"j","examples":["e"],"improvements":["i"]}]}
                """,
            AiModel = "m",
            CreatedAt = DateTime.UtcNow,
        });
        await db.SaveChangesAsync();

        var detail = await svc.GetDetailAsync(user.UserId, sessionId);
        Assert.Null(detail.Feedback.Vocabulary);
        Assert.Null(detail.Feedback.Criteria[0].Rewrites);
        Assert.Null(detail.Turns[0].DurationSeconds);
    }

    /// <summary>Total words over total time — not a mean of per-turn rates — counted from the raw
    /// lexical text with pause markers stripped, and never taken from the client.</summary>
    [Fact]
    public async Task Evaluate_ComputesSpeechRate_IgnoringClientValue()
    {
        var (svc, db, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            // 4 words in 12s and 2 words in 8s: 6 words / 20s = 18 wpm. A mean of the two
            // per-turn rates (20 and 15) would say 17.5 — wrong.
            new("candidate", "One two, three four.", "one two [pause 1.5s] three four", 12m),
            new("candidate", "Five six.", "five six", 8m),
        };
        var pronunciation = Pronunciation(72m) with { WordsPerMinute = 999m };
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns, pronunciation));

        Assert.Contains("Measured speech rate: 18 words per minute", gemini.LastUserContent);
        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        Assert.Equal(18m, detail.Pronunciation!.WordsPerMinute);
    }

    [Fact]
    public async Task Evaluate_TooLittleSpeech_LeavesSpeechRateUnavailable()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn> { new("candidate", "Yes I do.", "yes i do", 0.9m) };
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns, Pronunciation(72m)));

        Assert.Contains("Measured speech rate: not available.", gemini.LastUserContent);
        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        Assert.Null(detail.Pronunciation!.WordsPerMinute);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(901)]
    public async Task Evaluate_TurnDurationOutOfRange_ThrowsValidation_NoGeminiCall(decimal seconds)
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn> { new("candidate", "A small town.", "a small town", seconds) };
        var ex = await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns)));
        Assert.Equal("Invalid turn duration.", ex.Message);
        Assert.Equal(0, gemini.Calls);
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
        Assert.Equal(new[] { "overallBand", "summary", "criteria", "vocabulary" }, required);

        var criteria = root.GetProperty("properties").GetProperty("criteria");
        Assert.Equal(3, criteria.GetProperty("minItems").GetInt32());
        Assert.Equal(3, criteria.GetProperty("maxItems").GetInt32());
        var criterionRequired = criteria.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "name", "band", "justification", "examples", "improvements", "rewrites" }, criterionRequired);

        var rewriteRequired = criteria.GetProperty("items").GetProperty("properties").GetProperty("rewrites")
            .GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "original", "improved", "explanation" }, rewriteRequired);

        var vocabularyRequired = root.GetProperty("properties").GetProperty("vocabulary")
            .GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "phrase", "level", "replaces", "original", "improved" }, vocabularyRequired);
    }

    /// <summary>A band is a score, not a draft. Gemini samples at its own default temperature, so
    /// without pinning it to 0 the same submission can come back half a band apart on two runs —
    /// the one thing a scoring product must never do. Asserted here rather than only in the client
    /// because the requirement is that THIS service sends it, not merely that the client could.</summary>
    [Fact]
    public async Task Evaluate_PinsTemperatureToZero_SoBandsDoNotDrift()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Equal(0, gemini.LastTemperature);
    }
}
