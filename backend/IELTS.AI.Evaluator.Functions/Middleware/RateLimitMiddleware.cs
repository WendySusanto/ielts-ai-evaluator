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
        // leaked loop here is spendable outside the app entirely. A session needs ~4.
        ["SpeechToken_Get"] = (30, 60),
    };

    private static readonly (int Limit, int WindowMinutes) Default = (300, 60);

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
        // GetOrCreate can race two factories on first hit; the loser's counter is discarded,
        // costing at most one uncounted request per window. Not worth a lock.
        var counter = cache.GetOrCreate(key, entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = window;
            return new StrongBox<int>(0);
        })!;

        return Interlocked.Increment(ref counter.Value) <= limit;
    }
}
