using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Tests;

public class UserServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static async Task<(UserService svc, EvaluatorDbContext db, User user)> Setup()
    {
        var db = NewDb();
        var user = new User
        {
            UserId = Guid.NewGuid(),
            FirebaseUid = "fake-uid",
            Email = "t@t.t",
            FullName = "Old Name",
            Plan = "Premium",
            IELTSTargetScore = 6.5m,
            TargetTestDate = DateTimeOffset.UtcNow.AddMonths(3),
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return (new UserService(db), db, user);
    }

    [Fact]
    public async Task UpdateProfile_UpdatesAllowedFields_ButNeverPlan()
    {
        var (svc, _, user) = await Setup();
        var newTargetDate = DateTimeOffset.UtcNow.AddMonths(9);

        var updated = await svc.UpdateProfileAsync(user.UserId, new UpdateProfileRequest("New Name", 7.5m, newTargetDate));

        Assert.Equal("New Name", updated.FullName);
        Assert.Equal(7.5m, updated.IeltsTargetScore);
        Assert.Equal(newTargetDate, updated.TargetTestDate);
        // Plan is never part of UpdateProfileRequest — the signature itself makes this impossible to regress.
        Assert.Equal("Premium", updated.Plan);
    }

    [Fact]
    public async Task GetProfile_UnsetTargets_ReturnNull_MatchingAuthSyncContract()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "u", Email = "t@t.t", FullName = "T", Plan = "Free" };
        db.Users.Add(user);
        await db.SaveChangesAsync();

        var profile = await new UserService(db).GetProfileAsync(user.UserId);

        Assert.Null(profile.IeltsTargetScore);
        Assert.Null(profile.TargetTestDate);
    }

    [Fact]
    public async Task GetProfile_UnknownUser_ThrowsNotFound()
    {
        var svc = new UserService(NewDb());
        await Assert.ThrowsAsync<NotFoundException>(() => svc.GetProfileAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task UpdateProfile_UnknownUser_ThrowsNotFound()
    {
        var svc = new UserService(NewDb());
        await Assert.ThrowsAsync<NotFoundException>(() =>
            svc.UpdateProfileAsync(Guid.NewGuid(), new UpdateProfileRequest("X", 7.0m, DateTimeOffset.UtcNow)));
    }

    [Fact]
    public async Task ListUsers_CountsOnlyTodaysSpeechTokens_AndKeepsUsersWithNone()
    {
        var db = NewDb();
        var heavy = new User { UserId = Guid.NewGuid(), FirebaseUid = "a", Email = "a@t.t", FullName = "A", Plan = "Free" };
        var quiet = new User { UserId = Guid.NewGuid(), FirebaseUid = "b", Email = "b@t.t", FullName = "B", Plan = "Free" };
        db.Users.AddRange(heavy, quiet);
        db.SpeechTokenIssues.AddRange(
            new SpeechTokenIssue { SpeechTokenIssueId = Guid.NewGuid(), UserId = heavy.UserId },
            new SpeechTokenIssue { SpeechTokenIssueId = Guid.NewGuid(), UserId = heavy.UserId },
            // The table is a rolling log, so yesterday's issuance must not inflate today's column.
            new SpeechTokenIssue
            {
                SpeechTokenIssueId = Guid.NewGuid(),
                UserId = heavy.UserId,
                CreatedAt = DateTime.UtcNow.AddDays(-1),
            });
        await db.SaveChangesAsync();

        var users = await new UserService(db).ListUsersAsync();

        Assert.Equal(2, users.Single(u => u.UserId == heavy.UserId).SpeechTokensToday);
        // A user with no rows must read 0, not fall out of the list via the group join.
        Assert.Equal(0, users.Single(u => u.UserId == quiet.UserId).SpeechTokensToday);
    }

    [Fact]
    public async Task ListUsers_SumsGeminiTokensAcrossAllThreePaidPaths()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "a", Email = "a@t.t", FullName = "A", Plan = "Free" };
        var prompt = new SpeakingPrompt
        {
            SpeakingPromptId = Guid.NewGuid(), Topic = "T", Description = "D", Preview = "P",
            QuestionText = "Q", Part = "Part1",
        };
        var writingPrompt = new WritingPrompt
        {
            WritingPromptId = Guid.NewGuid(), Topic = "T", Description = "D", Preview = "P",
            QuestionType = "Table", QuestionText = "Q", TaskType = "Task1",
        };
        db.Users.Add(user);
        db.SpeakingPrompts.Add(prompt);
        db.WritingPrompts.Add(writingPrompt);

        db.WritingEvaluations.Add(new WritingEvaluation
        {
            WritingEvaluationId = Guid.NewGuid(), UserId = user.UserId, WritingPromptId = writingPrompt.WritingPromptId,
            EssayText = "e", Feedback = "{}", PromptTokens = 10, CompletionTokens = 5,
        });
        db.SpeakingSessions.Add(new SpeakingSession
        {
            SpeakingSessionId = Guid.NewGuid(), UserId = user.UserId, SpeakingPromptId = prompt.SpeakingPromptId,
            Part = "Part1", Turns = "[]", Feedback = "{}", PromptTokens = 100, CompletionTokens = 50,
        });
        db.ExaminerTurnUsages.Add(new ExaminerTurnUsage
        {
            ExaminerTurnUsageId = Guid.NewGuid(), UserId = user.UserId, PromptTokens = 1000, CompletionTokens = 500,
        });
        // Yesterday's examiner turn must not leak into today's total.
        db.ExaminerTurnUsages.Add(new ExaminerTurnUsage
        {
            ExaminerTurnUsageId = Guid.NewGuid(), UserId = user.UserId,
            PromptTokens = 9999, CompletionTokens = 9999, CreatedAt = DateTime.UtcNow.AddDays(-1),
        });
        await db.SaveChangesAsync();

        var users = await new UserService(db).ListUsersAsync();

        Assert.Equal(10 + 5 + 100 + 50 + 1000 + 500, users.Single().GeminiTokensToday);
    }

    [Fact]
    public async Task DeleteUser_FlipsIsDeleted_AndDropsThemFromTheAdminList()
    {
        var (svc, db, user) = await Setup();
        var admin = new User { UserId = Guid.NewGuid(), FirebaseUid = "admin", Email = "a@a.a", FullName = "Admin", Plan = "Admin" };
        db.Users.Add(admin);
        await db.SaveChangesAsync();

        await svc.DeleteUserAsync(admin.UserId, user.UserId);

        Assert.True(db.Users.Single(u => u.UserId == user.UserId).IsDeleted);
        Assert.DoesNotContain(await svc.ListUsersAsync(), u => u.UserId == user.UserId);
    }

    [Fact]
    public async Task DeleteUser_RefusesSelfDelete_SoAnAdminCannotLockThemselvesOut()
    {
        var (svc, _, user) = await Setup();

        await Assert.ThrowsAsync<ValidationException>(() => svc.DeleteUserAsync(user.UserId, user.UserId));
    }

    [Fact]
    public async Task DeleteUser_AlreadyDeletedOrUnknown_ThrowsNotFound()
    {
        var (svc, db, user) = await Setup();
        user.IsDeleted = true;
        await db.SaveChangesAsync();

        await Assert.ThrowsAsync<NotFoundException>(() => svc.DeleteUserAsync(Guid.NewGuid(), user.UserId));
        await Assert.ThrowsAsync<NotFoundException>(() => svc.DeleteUserAsync(Guid.NewGuid(), Guid.NewGuid()));
    }
}
