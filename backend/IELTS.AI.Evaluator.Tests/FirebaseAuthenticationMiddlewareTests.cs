using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace IELTS.AI.Evaluator.Tests;

// ponytail: tests the extracted ResolveAccountStateAsync() instead of faking FunctionContext —
// same convention as ExceptionHandlingMiddlewareTests. What we own is "plan comes from the
// database, not the token claim, and a missing row fails closed".
public class FirebaseAuthenticationMiddlewareTests
{
    private static readonly TimeSpan Ttl = TimeSpan.FromSeconds(60);

    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    private static IMemoryCache NewCache() => new MemoryCache(new MemoryCacheOptions());

    private static User AddUser(EvaluatorDbContext db, string plan, bool isDeleted = false)
    {
        var user = new User
        {
            UserId = Guid.NewGuid(),
            FirebaseUid = "uid-1",
            Email = "a@b.c",
            FullName = "Alice",
            Plan = plan,
            IsDeleted = isDeleted,
        };
        db.Users.Add(user);
        db.SaveChanges();
        return user;
    }

    [Fact]
    public async Task ReadsPlanFromDatabase()
    {
        var db = NewDb();
        var user = AddUser(db, "Admin");

        var state = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(
            NewCache(), db, user.UserId, Ttl);

        Assert.Equal("Admin", state.Plan);
        Assert.False(state.IsDeleted);
    }

    [Fact]
    public async Task DemotionTakesEffect_OnceTheCacheExpires()
    {
        var db = NewDb();
        var cache = NewCache();
        var user = AddUser(db, "Admin");

        var before = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(cache, db, user.UserId, Ttl);
        Assert.Equal("Admin", before.Plan);

        // Admin demotes them in the database. Their Firebase ID token still says "Admin" for up
        // to an hour — the whole point is that the backend stops caring.
        user.Plan = "Free";
        db.SaveChanges();

        // Within the TTL the cached value still wins; that bounded staleness is the trade.
        var cached = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(cache, db, user.UserId, Ttl);
        Assert.Equal("Admin", cached.Plan);

        var after = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(
            NewCache(), db, user.UserId, Ttl); // fresh cache == TTL elapsed
        Assert.Equal("Free", after.Plan);
    }

    [Fact]
    public async Task SoftDeletedUser_IsReportedDeleted()
    {
        var db = NewDb();
        var user = AddUser(db, "Premium", isDeleted: true);

        var state = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(
            NewCache(), db, user.UserId, Ttl);

        Assert.True(state.IsDeleted);
    }

    [Fact]
    public async Task MissingUserRow_FailsClosed()
    {
        var state = await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(
            NewCache(), NewDb(), Guid.NewGuid(), Ttl);

        // A valid token whose userId claim points at nothing is not a usable account, and it
        // must not fall back to a working "Free" role.
        Assert.True(state.IsDeleted);
        Assert.Equal("Free", state.Plan);
    }

    [Fact]
    public async Task CachesPerUser_NotGlobally()
    {
        var db = NewDb();
        var cache = NewCache();
        var admin = AddUser(db, "Admin");
        var free = new User { UserId = Guid.NewGuid(), FirebaseUid = "uid-2", Email = "b@c.d", FullName = "Bob", Plan = "Free" };
        db.Users.Add(free);
        db.SaveChanges();

        Assert.Equal("Admin", (await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(cache, db, admin.UserId, Ttl)).Plan);
        Assert.Equal("Free", (await FirebaseAuthenticationMiddleware.ResolveAccountStateAsync(cache, db, free.UserId, Ttl)).Plan);
    }
}
