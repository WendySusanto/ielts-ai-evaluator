using System.Net;
using System.Runtime.CompilerServices;
using FirebaseAdmin.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Caching.Memory;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Per-user request cap, applied after authentication so the key is the verified
/// Firebase uid (not a spoofable IP). Bounds the paid calls the daily evaluation quotas don't
/// reach: examiner turns and Azure Speech tokens are both unmetered otherwise.</summary>
public class RateLimitMiddleware : IFunctionsWorkerMiddleware
{
    // ponytail: fixed window, in-process. Exact on one instance, up to N× looser when the
    // Function App scales to N instances — good enough to stop a scripted loop. Move the
    // counter to Redis only if a real bill says the slack matters.
    private static readonly Dictionary<string, (int Limit, int WindowMinutes)> PerFunction = new()
    {
        // One paid Gemini call per turn, and Turns is client-supplied, so the 8-turn cap in
        // ExaminerService is per-request only. A real Part1→Part3 session uses ~20.
        ["SpeakingV2_ExaminerTurn"] = (60, 60),
        // Azure STS tokens last 10 min and work against the Speech resource directly, so a
        // leaked loop here is spendable outside the app entirely. The client shares one
        // in-flight request and caches for 8 min, so a session needs 1 plus 1 per 8 minutes.
        ["SpeechToken_Get"] = (30, 60),
    };

    private static readonly (int Limit, int WindowMinutes) Default = (300, 60);

    private static readonly object Gate = new();

    private readonly IMemoryCache _cache;

    public RateLimitMiddleware(IMemoryCache cache) => _cache = cache;

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();
        // No token means the auth middleware already rejected this; nothing to meter.
        if (req is null || context.Items["FirebaseToken"] is not FirebaseToken token)
        {
            await next(context);
            return;
        }

        var name = context.FunctionDefinition.Name;
        var (limit, windowMinutes) = PerFunction.TryGetValue(name, out var configured) ? configured : Default;

        if (!TryConsume(_cache, $"rl:{name}:{token.Uid}", limit, TimeSpan.FromMinutes(windowMinutes)))
        {
            var res = req.CreateResponse(HttpStatusCode.TooManyRequests);
            res.Headers.Add("Retry-After", (windowMinutes * 60).ToString());
            await res.WriteAsJsonAsync(new { message = "Too many requests. Please slow down and try again later." });
            res.StatusCode = HttpStatusCode.TooManyRequests; // WriteAsJsonAsync resets to 200
            context.GetInvocationResult().Value = res;
            return;
        }

        await next(context);
    }

    /// <summary>Increments the window counter for <paramref name="key"/>; false once it exceeds
    /// <paramref name="limit"/>. Extracted so the window logic is testable without faking the
    /// isolated-worker FunctionContext.</summary>
    internal static bool TryConsume(IMemoryCache cache, string key, int limit, TimeSpan window)
    {
        StrongBox<int> counter;

        // MemoryCache.GetOrCreate is not atomic: on a concurrent first hit it runs the factory
        // on several threads and hands each its own counter, so every one of them sees "1" and
        // passes — a burst slips past the limit. The lock guarantees a single shared counter.
        // ponytail: one global lock, held for a dictionary lookup. Stripe it by key only if a
        // profiler ever shows contention here.
        lock (Gate)
        {
            counter = cache.GetOrCreate(key, entry =>
            {
                entry.AbsoluteExpirationRelativeToNow = window;
                return new StrongBox<int>(0);
            })!;
        }

        return Interlocked.Increment(ref counter.Value) <= limit;
    }
}
