using System.Net;
using System.Runtime.CompilerServices;
using System.Text.Json;
using FirebaseAdmin.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Caching.Memory;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Per-user request cap keyed on the verified Firebase uid. Covers the paid calls with no
/// daily quota: examiner turns and Azure Speech tokens.</summary>
public class RateLimitMiddleware : IFunctionsWorkerMiddleware
{
    // ponytail: fixed window, in-process — up to N× looser across N instances, enough to stop a
    // scripted loop. Move to Redis if a real bill says it matters.
    private static readonly Dictionary<string, (int Limit, int WindowMinutes)> PerFunction = new()
    {
        // One paid Gemini call per turn, and Turns is client-supplied, so the 8-turn cap in
        // ExaminerService is per-request only. A real Part1→Part3 session uses ~20.
        ["SpeakingV2_ExaminerTurn"] = (60, 60),
        // STS tokens work against Azure directly for 10 min, so a leak is spendable outside the app.
        // The client caches for 8 min: a session needs 1 plus 1 per 8 minutes.
        ["SpeechToken_Get"] = (30, 60),
        // A paid Gemini lookup per click of "Fill with AI" — far more than anyone adds by hand.
        ["Notebook_Suggest"] = (60, 60),
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
            res.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await res.WriteStringAsync(JsonSerializer.Serialize(new { message = "Too many requests. Please slow down and try again later." }));
            context.GetInvocationResult().Value = res;
            return;
        }

        await next(context);
    }

    /// <summary>Increments the window counter for <paramref name="key"/>; false once past
    /// <paramref name="limit"/>. Extracted for unit tests.</summary>
    internal static bool TryConsume(IMemoryCache cache, string key, int limit, TimeSpan window)
    {
        StrongBox<int> counter;

        // GetOrCreate isn't atomic: concurrent first hits would each get their own counter and slip past
        // the limit. ponytail: one global lock; stripe it by key only if a profiler shows contention.
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
