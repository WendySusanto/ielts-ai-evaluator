using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class AuthSyncServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task NewFirebaseUser_CreatesRow_AndRequestsClaims()
    {
        var db = NewDb();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (profile, setClaims, userId, role) = await svc.SyncAsync(
            "uid-1", "a@b.c", "Alice", new Dictionary<string, object>());

        Assert.True(setClaims);
        Assert.Equal("Free", role);
        Assert.Equal("a@b.c", profile.Email);
        Assert.Single(db.Users.Where(u => u.FirebaseUid == "uid-1"));
        Assert.Equal(userId, db.Users.Single().UserId);
    }

    [Fact]
    public async Task ExistingUser_WithMatchingClaims_DoesNotRequestClaims()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "uid-1", Email = "a@b.c", FullName = "Alice", Plan = "Free" };
        db.Users.Add(user);
        db.SaveChanges();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (_, setClaims, userId, role) = await svc.SyncAsync("uid-1", "a@b.c", "Alice",
            new Dictionary<string, object> { ["userId"] = user.UserId.ToString(), ["role"] = "Free" });

        Assert.False(setClaims);
        Assert.Equal(user.UserId, userId);
        Assert.Equal("Free", role);
    }

    [Fact]
    public async Task PlanChanged_RequestsClaimRefresh()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "uid-1", Email = "a@b.c", FullName = "Alice", Plan = "Premium" };
        db.Users.Add(user);
        db.SaveChanges();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (profile, setClaims, _, role) = await svc.SyncAsync("uid-1", "a@b.c", "Alice",
            new Dictionary<string, object> { ["userId"] = user.UserId.ToString(), ["role"] = "Free" });

        Assert.True(setClaims);
        Assert.Equal("Premium", role);
        Assert.True(profile.ClaimsRefreshRequired);
    }
}
