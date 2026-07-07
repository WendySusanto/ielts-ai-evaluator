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
            AuthProvider = "Firebase",
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
        Assert.Equal(7.5m, updated.IELTSTargetScore);
        Assert.Equal(newTargetDate, updated.TargetTestDate);
        // Plan is never part of UpdateProfileRequest — the signature itself makes this impossible to regress.
        Assert.Equal("Premium", updated.Plan);
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
}
