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
            ["GeminiScoringThinkingLevel"] = "high",
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
                    "Plural subject, and the present continuous for an ongoing change.") },
                new SpeakingNextBand(8m, "Band 8 needs mostly error-free sentences; 'temperature become hotter' slips.",
                    "Check subject-verb agreement on every sentence about trends.")),
        },
        Vocabulary: new List<SpeakingVocabularyUpgrade>
        {
            new("exacerbate", "C1", "make worse", "the smoke make the air worse",
                "the smoke exacerbates air pollution"),
        },
        Answers: new List<SpeakingAnswerFeedback>
        {
            new(1, "Direct, but it stops before giving a reason.",
                "I'm from a small town on the coast. It's quiet, which I love, because I can walk by the sea every evening.",
                "Uh, I come from a small town near the coast, it's quiet and, eee, beautiful."),
        },
        Errors: new List<SpeakingError>
        {
            new("temperature become hotter", "temperatures are getting hotter", "agreement",
                "A plural subject takes a plural verb."),
        },
        PronunciationNotes: new List<SpeakingPronunciationNote>
        {
            new("scenery", "scenary", "Stress the first syllable: SEE-nuh-ree."),
        });

    private static (SpeakingService svc, EvaluatorDbContext db, FakeStructuredClient gemini, User user, SpeakingPrompt prompt)
        Setup(string role = "Free", int sessionsToday = 0, FakeAudioStore? audio = null)
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
        var svc = new SpeakingService(gemini, db, Config(), audio ?? new FakeAudioStore());
        return (svc, db, gemini, user, prompt);
    }

    private static SpeakingEvaluateRequest Request(SpeakingPrompt prompt, List<SpeakingTurn>? turns = null,
        PronunciationResult? pronunciation = null, List<SpeakingAudioClip>? audio = null, Guid? clientSessionId = null) =>
        new(prompt.SpeakingPromptId, "Part1", turns ?? new List<SpeakingTurn>
        {
            new("examiner", "Tell me about your hometown."),
            new("candidate", "I come from a small town near the coast, it's quiet and beautiful."),
        }, pronunciation, audio, clientSessionId);

    private static SpeakingAudioClip Clip(int answer, string mime = "audio/webm;codecs=opus", decimal seconds = 10,
        byte[]? data = null) => new(answer, mime, seconds, Convert.ToBase64String(data ?? [1, 2, 3]));

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
        Assert.Contains("Candidate (answer 1): I come from a small town. It's quiet.", gemini.LastUserContent);
        Assert.Contains("Candidate (answer 1): i come from a uh [pause 2.4s] small town it's quiet", gemini.LastUserContent);
        Assert.Contains("Raw recognition", gemini.LastUserContent);
    }

    /// <summary>answers[].answer points back into this numbering, so an answer without raw
    /// recognition (typed, or from before a resume) still takes its number — otherwise every later
    /// answer's feedback would land on the wrong turn.</summary>
    [Fact]
    public async Task Evaluate_NumbersAnswersInOrder_InBothRenderings()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Where are you from?"),
            new("candidate", "A small town."),
            new("examiner", "Do you like it?"),
            new("candidate", "Yes, it's quiet.", "yes it's quiet"),
        };
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns));

        var content = gemini.LastUserContent!;
        Assert.Contains("Candidate (answer 1): A small town.", content);
        Assert.Contains("Candidate (answer 2): Yes, it's quiet.", content);
        var rawBlock = content[content.IndexOf("Raw recognition", StringComparison.Ordinal)..];
        Assert.Contains("Candidate (answer 2): yes it's quiet", rawBlock);
        Assert.DoesNotContain("answer 1", rawBlock);
    }

    /// <summary>Gemini knows which answer a recording belongs to because it arrives right after that
    /// answer's line, labelled with the same number.</summary>
    [Fact]
    public async Task Evaluate_WithRecording_PlacesItRightAfterItsAnswer()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var turns = new List<SpeakingTurn>
        {
            new("examiner", "Where are you from?"),
            new("candidate", "A small town."),
            new("examiner", "Do you like it?"),
            new("candidate", "Yes, it's quiet.", "yes it's quiet"),
        };
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, turns, audio: [Clip(2, data: [9, 9])]));

        var parts = gemini.LastUserParts!;
        Assert.Equal(3, parts.Count);
        Assert.EndsWith("Candidate (answer 2): Yes, it's quiet.\nRecording of answer 2:\n", parts[0].Text!.Replace("\r\n", "\n"));
        Assert.Equal("audio/webm", parts[1].MimeType);
        Assert.Equal(new byte[] { 9, 9 }, parts[1].Data);
        Assert.Contains("Raw recognition", parts[2].Text);
    }

    [Fact]
    public async Task Evaluate_SafariRecording_IsSentToGeminiAsM4a()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: [Clip(1, mime: "audio/mp4")]));
        Assert.Equal("audio/m4a", gemini.LastUserParts!.Single(p => p.Data is not null).MimeType);
    }

    [Fact]
    public async Task Evaluate_WithoutRecordings_SendsOneTextPart()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Single(gemini.LastUserParts!);
    }

    public static TheoryData<SpeakingAudioClip[]> InvalidRecordings => new()
    {
        new[] { Clip(1, mime: "audio/wav") },                     // a type the recorder never produces
        new[] { Clip(1), Clip(1) },                               // two recordings for one answer
        new[] { Clip(2) },                                        // the request has only answer 1
        new[] { Clip(1, seconds: 311) },                          // past the five-minute cap
        new[] { Clip(1, seconds: 0) },
        new[] { new SpeakingAudioClip(1, "audio/webm", 5, "not base64!") },
        new[] { Clip(1, data: new byte[3_000_001]) },             // past the byte cap
        new[] { Clip(1, data: []) },
    };

    /// <summary>Every recording check runs before Gemini is called, so a bad clip costs nothing.</summary>
    [Theory]
    [MemberData(nameof(InvalidRecordings))]
    public async Task Evaluate_InvalidRecording_ThrowsValidation_NoGeminiCall(SpeakingAudioClip[] audio)
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: audio.ToList())));
        Assert.Equal(0, gemini.Calls);
    }

    /// <summary>A 400 is rejected before generation, so it is free; when the request carried audio, the
    /// audio is the likely cause. One retry without it still gets the candidate their feedback.</summary>
    [Fact]
    public async Task Evaluate_GeminiRejectsRecording_RetriesOnceWithoutIt()
    {
        var (svc, db, gemini, user, prompt) = Setup();
        gemini.RejectInlineMedia = true;

        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: [Clip(1)]));

        Assert.Equal(2, gemini.Calls);
        Assert.DoesNotContain(gemini.LastUserParts!, p => p.Data is not null);
        Assert.True(await db.SpeakingSessions.AnyAsync(s => s.SpeakingSessionId == result.SpeakingSessionId));
    }

    /// <summary>A retry after a lost response (refresh, a browser that gave up waiting) carries the same
    /// id. It must get the saved result back, not a second paid evaluation.</summary>
    [Fact]
    public async Task Evaluate_SameClientSessionId_ReturnsTheSavedResult_WithoutPayingAgain()
    {
        var (svc, db, gemini, user, prompt) = Setup();
        var id = Guid.NewGuid();

        var first = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));
        var retry = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));

        Assert.Equal(id, first.SpeakingSessionId);
        Assert.Equal(id, retry.SpeakingSessionId);
        Assert.Equal(first.OverallBand, retry.OverallBand);
        Assert.Equal(1, gemini.Calls);
        Assert.Equal(1, await db.SpeakingSessions.CountAsync(s => s.SpeakingSessionId == id));
    }

    /// <summary>The retry must not be refused for the quota slot its own first attempt used.</summary>
    [Fact]
    public async Task Evaluate_RetryAfterTheLastQuotaSlot_StillReturnsTheSavedResult()
    {
        var (svc, _, gemini, user, prompt) = Setup(sessionsToday: 9);
        var id = Guid.NewGuid();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));

        var retry = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));

        Assert.Equal(id, retry.SpeakingSessionId);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task Evaluate_AnotherUsersSessionId_ThrowsValidation()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var id = Guid.NewGuid();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));

        await Assert.ThrowsAsync<ValidationException>(() =>
            svc.EvaluateAsync(Guid.NewGuid(), "Free", Request(prompt, clientSessionId: id)));
        Assert.Equal(1, gemini.Calls);
    }

    private static void SeedEvaluation(EvaluatorDbContext db, Guid id, Guid userId, string status, TimeSpan age,
        string? error = null)
    {
        db.SpeakingEvaluations.Add(new SpeakingEvaluation
        {
            SpeakingEvaluationId = id, UserId = userId, Status = status, StartedAt = DateTime.UtcNow - age, Error = error,
        });
        db.SaveChanges();
    }

    [Fact]
    public async Task Evaluate_RecordsTheEvaluation_AsCompleted()
    {
        var (svc, db, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var evaluation = await db.SpeakingEvaluations.SingleAsync(e => e.SpeakingEvaluationId == result.SpeakingSessionId);
        Assert.Equal(SpeakingEvaluationStatus.Completed, evaluation.Status);
        Assert.Null(evaluation.Error);
    }

    /// <summary>The page learns about a failure from the poll, not from the (possibly long gone)
    /// request, so the failure has to be written down — and the request still fails for anyone still
    /// waiting on it.</summary>
    [Fact]
    public async Task Evaluate_GeminiFails_MarksTheEvaluationFailed_AndRethrows()
    {
        var (svc, db, gemini, user, prompt) = Setup();
        gemini.FailWith = new TimeoutException("Gemini did not answer within 150s.");
        var id = Guid.NewGuid();

        await Assert.ThrowsAsync<TimeoutException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id)));

        var evaluation = await db.SpeakingEvaluations.AsNoTracking().SingleAsync(e => e.SpeakingEvaluationId == id);
        Assert.Equal(SpeakingEvaluationStatus.Failed, evaluation.Status);
        Assert.Contains("longer than expected", evaluation.Error);
        Assert.False(await db.SpeakingSessions.AnyAsync(s => s.SpeakingSessionId == id));
    }

    /// <summary>A retry while the first attempt is still scoring must not pay a second time.</summary>
    [Fact]
    public async Task Evaluate_WhileTheSameIdIsStillRunning_ThrowsInProgress_NoGeminiCall()
    {
        var (svc, db, gemini, user, prompt) = Setup();
        var id = Guid.NewGuid();
        SeedEvaluation(db, id, user.UserId, SpeakingEvaluationStatus.Processing, TimeSpan.FromSeconds(20));

        await Assert.ThrowsAsync<EvaluationInProgressException>(() =>
            svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id)));
        Assert.Equal(0, gemini.Calls);
    }

    public static TheoryData<string, int> FinishedAttempts => new()
    {
        { SpeakingEvaluationStatus.Failed, 1 },
        { SpeakingEvaluationStatus.Processing, 10 }, // stale: the worker died without writing "failed"
    };

    [Theory]
    [MemberData(nameof(FinishedAttempts))]
    public async Task Evaluate_AfterAFailedOrStaleAttempt_RunsAgain(string status, int minutesAgo)
    {
        var (svc, db, gemini, user, prompt) = Setup();
        var id = Guid.NewGuid();
        SeedEvaluation(db, id, user.UserId, status, TimeSpan.FromMinutes(minutesAgo), "Scoring failed. Please try again.");

        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, clientSessionId: id));

        Assert.Equal(1, gemini.Calls);
        var evaluation = await db.SpeakingEvaluations.AsNoTracking().SingleAsync(e => e.SpeakingEvaluationId == id);
        Assert.Equal(SpeakingEvaluationStatus.Completed, evaluation.Status);
        Assert.Null(evaluation.Error);
    }

    /// <summary>The browser closing or dropping the request must not cancel a call that is being paid
    /// for — the poll, or the History page, picks the result up later.</summary>
    [Fact]
    public async Task Evaluate_CallsGeminiWithoutTheRequestToken()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        using var request = new CancellationTokenSource();

        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt), request.Token);

        Assert.False(gemini.LastToken.CanBeCanceled);
    }

    [Fact]
    public async Task GetEvaluationStatus_SavedSession_IsCompleted()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var status = await svc.GetEvaluationStatusAsync(user.UserId, result.SpeakingSessionId);
        Assert.Equal(SpeakingEvaluationStatus.Completed, status.Status);
    }

    [Fact]
    public async Task GetEvaluationStatus_ReportsProcessing_StaleAsFailed_AndTheFailureMessage()
    {
        var (svc, db, _, user, _) = Setup();
        var running = Guid.NewGuid();
        var stale = Guid.NewGuid();
        var failed = Guid.NewGuid();
        SeedEvaluation(db, running, user.UserId, SpeakingEvaluationStatus.Processing, TimeSpan.FromSeconds(30));
        SeedEvaluation(db, stale, user.UserId, SpeakingEvaluationStatus.Processing, TimeSpan.FromMinutes(6));
        SeedEvaluation(db, failed, user.UserId, SpeakingEvaluationStatus.Failed, TimeSpan.FromMinutes(1),
            "Scoring failed. Please try again.");

        Assert.Equal(SpeakingEvaluationStatus.Processing, (await svc.GetEvaluationStatusAsync(user.UserId, running)).Status);
        var staleStatus = await svc.GetEvaluationStatusAsync(user.UserId, stale);
        Assert.Equal(SpeakingEvaluationStatus.Failed, staleStatus.Status);
        Assert.Contains("did not finish", staleStatus.Error);
        Assert.Equal("Scoring failed. Please try again.", (await svc.GetEvaluationStatusAsync(user.UserId, failed)).Error);
    }

    [Fact]
    public async Task GetEvaluationStatus_UnknownOrSomeoneElses_IsNotFound()
    {
        var (svc, db, _, user, _) = Setup();
        var id = Guid.NewGuid();
        SeedEvaluation(db, id, user.UserId, SpeakingEvaluationStatus.Processing, TimeSpan.Zero);

        await Assert.ThrowsAsync<NotFoundException>(() => svc.GetEvaluationStatusAsync(Guid.NewGuid(), id));
        await Assert.ThrowsAsync<NotFoundException>(() => svc.GetEvaluationStatusAsync(user.UserId, Guid.NewGuid()));
    }

    [Fact]
    public async Task Evaluate_StoresRecordingsAfterSaving_AndDetailLinksThem()
    {
        var audio = new FakeAudioStore();
        var (svc, _, _, user, prompt) = Setup(audio: audio);

        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: [Clip(1, mime: "audio/mp4", data: [7])]));

        // Under its own prefix in the shared container, so a lifecycle rule can expire recordings alone.
        var blobName = $"speaking-audio/{user.UserId}/{result.SpeakingSessionId}/answer-1.m4a";
        Assert.Equal("audio/mp4", audio.Uploads[blobName].ContentType);
        Assert.Equal(new byte[] { 7 }, audio.Uploads[blobName].Data);
        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        var link = Assert.Single(detail.Audio!);
        Assert.Equal(1, link.Answer);
        Assert.Equal($"https://audio.test/{blobName}?minutes=30", link.Url);
    }

    /// <summary>The paid feedback is saved before any upload, so a storage outage only costs playback.</summary>
    [Fact]
    public async Task Evaluate_UploadFails_FeedbackIsStillSaved_WithoutPlayback()
    {
        var (svc, db, _, user, prompt) = Setup(audio: new FakeAudioStore { FailUploads = true });

        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: [Clip(1)]));

        var row = await db.SpeakingSessions.SingleAsync(s => s.SpeakingSessionId == result.SpeakingSessionId);
        Assert.Null(row.AudioClips);
        Assert.Null((await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId)).Audio);
    }

    [Fact]
    public async Task Evaluate_WithoutAudioStorage_StillSendsRecordingsToGemini()
    {
        var audio = new FakeAudioStore { IsConfigured = false };
        var (svc, _, gemini, user, prompt) = Setup(audio: audio);

        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt, audio: [Clip(1)]));

        Assert.Contains(gemini.LastUserParts!, p => p.Data is not null);
        Assert.Empty(audio.Uploads);
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

    /// <summary>Every new session records which feedback schema produced it, so a future change that
    /// is not additive can tell old rows apart without sniffing their JSON.</summary>
    [Fact]
    public async Task Evaluate_StampsCurrentFeedbackVersion()
    {
        var (svc, db, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var row = await db.SpeakingSessions.SingleAsync(s => s.SpeakingSessionId == result.SpeakingSessionId);
        Assert.Equal(SpeakingService.CurrentFeedbackVersion, row.FeedbackVersion);
        Assert.Equal(3, row.FeedbackVersion);
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
        Assert.Null(detail.Feedback.Answers);
        Assert.Null(detail.Feedback.Errors);
        Assert.Null(detail.Feedback.Criteria[0].NextBand);
        Assert.Null(detail.Feedback.PronunciationNotes);
    }

    /// <summary>The three v2 additions are what the feedback screen renders per answer, per criterion
    /// and in the mistakes card, so they have to survive the jsonb round trip intact.</summary>
    [Fact]
    public async Task GetDetail_RoundTripsAnswersErrorsAndNextBand()
    {
        var (svc, _, _, user, prompt) = Setup();
        var result = await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));

        var detail = await svc.GetDetailAsync(user.UserId, result.SpeakingSessionId);
        var answer = Assert.Single(detail.Feedback.Answers!);
        Assert.Equal(1, answer.Answer);
        Assert.StartsWith("I'm from a small town", answer.SampleAnswer);
        Assert.StartsWith("Uh, I come from", answer.Transcript);
        var error = Assert.Single(detail.Feedback.Errors!);
        Assert.Equal("agreement", error.Category);
        Assert.Equal(8m, detail.Feedback.Criteria[2].NextBand!.Band);
        Assert.Null(detail.Feedback.Criteria[0].NextBand);
        Assert.Equal("scenary", Assert.Single(detail.Feedback.PronunciationNotes!).HeardAs);
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
        Assert.Equal(new[] { "overallBand", "summary", "criteria", "vocabulary", "answers", "errors", "pronunciationNotes" }, required);

        var criteria = root.GetProperty("properties").GetProperty("criteria");
        Assert.Equal(3, criteria.GetProperty("minItems").GetInt32());
        Assert.Equal(3, criteria.GetProperty("maxItems").GetInt32());
        var criterionRequired = criteria.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "name", "band", "justification", "examples", "improvements", "rewrites", "nextBand" }, criterionRequired);

        var nextBand = criteria.GetProperty("items").GetProperty("properties").GetProperty("nextBand");
        Assert.True(nextBand.GetProperty("nullable").GetBoolean());
        Assert.Equal(new[] { "band", "missing", "howTo" },
            nextBand.GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList());

        var answersRequired = root.GetProperty("properties").GetProperty("answers")
            .GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "answer", "transcript", "comment", "sampleAnswer" }, answersRequired);

        var transcript = root.GetProperty("properties").GetProperty("answers").GetProperty("items")
            .GetProperty("properties").GetProperty("transcript");
        Assert.True(transcript.GetProperty("nullable").GetBoolean());

        var notes = root.GetProperty("properties").GetProperty("pronunciationNotes");
        Assert.Equal(6, notes.GetProperty("maxItems").GetInt32());
        Assert.Equal(new[] { "word", "heardAs", "tip" },
            notes.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList());

        var errors = root.GetProperty("properties").GetProperty("errors");
        Assert.Equal(15, errors.GetProperty("maxItems").GetInt32());
        Assert.Equal(new[] { "original", "corrected", "category", "explanation" },
            errors.GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList());

        var rewriteRequired = criteria.GetProperty("items").GetProperty("properties").GetProperty("rewrites")
            .GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "original", "improved", "explanation" }, rewriteRequired);

        var vocabularyRequired = root.GetProperty("properties").GetProperty("vocabulary")
            .GetProperty("items").GetProperty("required").EnumerateArray().Select(e => e.GetString()).ToList();
        Assert.Equal(new[] { "phrase", "level", "replaces", "original", "improved" }, vocabularyRequired);
    }

    /// <summary>Without a temperature pin, a description saying "one of exactly" is a request, not a
    /// rule: two of three live runs came back with "Lexical Resource" and "Grammatical Range and
    /// Accuracy" instead of the keys the feedback screen looks up. An enum is enforced by structured
    /// output, so every fixed-vocabulary field is pinned with one.</summary>
    [Fact]
    public void GeminiSchema_PinsFixedVocabulariesWithEnums()
    {
        using var doc = JsonDocument.Parse(SpeakingFeedbackPrompts.GeminiSchema);
        var properties = doc.RootElement.GetProperty("properties");
        string[] Enum(JsonElement field) => field.GetProperty("enum").EnumerateArray().Select(e => e.GetString()!).ToArray();

        Assert.Equal(new[] { "FluencyCoherence", "LexicalResource", "GrammaticalRangeAccuracy" },
            Enum(properties.GetProperty("criteria").GetProperty("items").GetProperty("properties").GetProperty("name")));
        Assert.Equal(new[] { "C1", "C2" },
            Enum(properties.GetProperty("vocabulary").GetProperty("items").GetProperty("properties").GetProperty("level")));
        Assert.Equal(
            new[] { "tense", "article", "agreement", "preposition", "word form", "word choice", "plural", "word order", "other" },
            Enum(properties.GetProperty("errors").GetProperty("items").GetProperty("properties").GetProperty("category")));
    }

    /// <summary>propertyOrdering is what makes Gemini write the evidence before the band. A property
    /// it leaves out or misspells silently loses that ordering, so every object in the schema must
    /// list exactly its own properties.</summary>
    [Fact]
    public void GeminiSchema_PropertyOrdering_ListsEveryPropertyExactlyOnce()
    {
        using var doc = JsonDocument.Parse(SpeakingFeedbackPrompts.GeminiSchema);
        foreach (var node in ObjectNodes(doc.RootElement))
        {
            var properties = node.GetProperty("properties").EnumerateObject().Select(p => p.Name).Order().ToList();
            var ordering = node.GetProperty("propertyOrdering").EnumerateArray().Select(e => e.GetString()!).Order().ToList();
            Assert.Equal(properties, ordering);
        }
    }

    private static IEnumerable<JsonElement> ObjectNodes(JsonElement node)
    {
        if (node.TryGetProperty("properties", out var properties))
        {
            yield return node;
            foreach (var property in properties.EnumerateObject())
                foreach (var child in ObjectNodes(property.Value))
                    yield return child;
        }
        if (node.TryGetProperty("items", out var items))
            foreach (var child in ObjectNodes(items))
                yield return child;
    }

    /// <summary>The scoring call thinks at the configured level and gets the long, final timeout.
    /// Asserted on this service, not only the client, because the requirement is that THIS call
    /// sends them.</summary>
    [Fact]
    public async Task Evaluate_UsesConfiguredThinkingLevel_AndScoringTimeout()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        await svc.EvaluateAsync(user.UserId, "Free", Request(prompt));
        Assert.Equal("high", gemini.LastThinkingLevel);
        Assert.Equal(GeminiStructuredClient.ScoringTimeout, gemini.LastTimeout);
    }
}

/// <summary>In-memory IAudioStore: records uploads; can fail them or act unconfigured.</summary>
public class FakeAudioStore : IAudioStore
{
    public bool IsConfigured { get; set; } = true;
    public bool FailUploads { get; set; }
    public Dictionary<string, (string ContentType, byte[] Data)> Uploads { get; } = new();

    public Task<bool> TryUploadAsync(string blobName, string contentType, byte[] data)
    {
        if (FailUploads)
            return Task.FromResult(false);
        Uploads[blobName] = (contentType, data);
        return Task.FromResult(true);
    }

    public Task<string?> ReadUrlAsync(string blobName, TimeSpan validFor) =>
        Task.FromResult<string?>($"https://audio.test/{blobName}?minutes={validFor.TotalMinutes}");
}
