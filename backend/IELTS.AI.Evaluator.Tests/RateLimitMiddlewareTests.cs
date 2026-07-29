using IELTS.AI.Evaluator.Functions.Middleware;
using Microsoft.Extensions.Caching.Memory;

namespace IELTS.AI.Evaluator.Tests;

// ponytail: tests the extracted TryConsume() instead of faking FunctionContext/HttpRequestData —
// same reasoning as ExceptionHandlingMiddlewareTests. The logic we own is the window counter.
public class RateLimitMiddlewareTests
{
    private static IMemoryCache NewCache() => new MemoryCache(new MemoryCacheOptions());

    [Fact]
    public void AllowsUpToTheLimit_ThenRejects()
    {
        var cache = NewCache();
        var window = TimeSpan.FromMinutes(60);

        for (var i = 1; i <= 3; i++)
            Assert.True(RateLimitMiddleware.TryConsume(cache, "k", 3, window), $"request {i} should pass");

        Assert.False(RateLimitMiddleware.TryConsume(cache, "k", 3, window));
        Assert.False(RateLimitMiddleware.TryConsume(cache, "k", 3, window));
    }

    [Fact]
    public void KeysAreIndependent()
    {
        var cache = NewCache();
        var window = TimeSpan.FromMinutes(60);

        Assert.True(RateLimitMiddleware.TryConsume(cache, "user-a", 1, window));
        Assert.False(RateLimitMiddleware.TryConsume(cache, "user-a", 1, window));
        // A different user (or a different function for the same user) gets its own window.
        Assert.True(RateLimitMiddleware.TryConsume(cache, "user-b", 1, window));
    }

    [Fact]
    public async Task WindowExpiry_ResetsTheCounter()
    {
        var cache = NewCache();
        var window = TimeSpan.FromMilliseconds(50);

        Assert.True(RateLimitMiddleware.TryConsume(cache, "k", 1, window));
        Assert.False(RateLimitMiddleware.TryConsume(cache, "k", 1, window));

        await Task.Delay(200);
        cache.TryGetValue("k", out _); // MemoryCache evicts expired entries lazily, on access

        Assert.True(RateLimitMiddleware.TryConsume(cache, "k", 1, window));
    }

    [Fact]
    public void ConcurrentRequests_NeverExceedTheLimit()
    {
        var cache = NewCache();
        var window = TimeSpan.FromMinutes(60);

        var allowed = 0;
        Parallel.For(0, 200, _ =>
        {
            if (RateLimitMiddleware.TryConsume(cache, "k", 50, window))
                Interlocked.Increment(ref allowed);
        });

        // Interlocked.Increment on the shared counter means no overshoot; a lost GetOrCreate
        // factory race can only undercount, never let extra requests through.
        Assert.True(allowed <= 50, $"allowed {allowed} of a 50 limit");
    }
}
