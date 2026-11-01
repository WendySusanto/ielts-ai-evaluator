using FirebaseAdmin.Auth;
using IELTS.AI.Evaluator.Data.Models;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using System.Net;
using System.Text.Json;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Verifies the Firebase token, then reads plan/deleted from the DB, since token claims can be
/// an hour stale. Cached per user for <see cref="AccountCacheTtl"/>, the real staleness bound.</summary>
public class FirebaseAuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    private static readonly TimeSpan AccountCacheTtl = TimeSpan.FromSeconds(60);

    /// <summary>Plan/deleted state as of the last database read. Plan doubles as the role.</summary>
    internal sealed record AccountState(string Plan, bool IsDeleted);

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();
        if (req is null) { await next(context); return; }

        var header = req.Headers.TryGetValues("Authorization", out var v) ? v.FirstOrDefault() : null;
        if (header is null || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            await Reject(context, req, HttpStatusCode.Unauthorized, "Missing bearer token");
            return;
        }

        FirebaseToken token;
        try
        {
            token = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(header["Bearer ".Length..].Trim());
        }
        catch (FirebaseAuthException)
        {
            await Reject(context, req, HttpStatusCode.Unauthorized, "Invalid or expired token");
            return;
        }

        context.Items["FirebaseToken"] = token;

        var isSync = context.FunctionDefinition.Name == "AuthSync";
        var hasUserId = token.Claims.TryGetValue("userId", out var uid) && Guid.TryParse(uid?.ToString(), out var userId);
        if (!isSync)
        {
            if (!hasUserId)
            {
                await Reject(context, req, HttpStatusCode.Forbidden, "Account not initialised. Call /api/auth/sync.");
                return;
            }

            var parsedUserId = Guid.Parse(token.Claims["userId"].ToString()!);
            var account = await ResolveAccountStateAsync(
                context.InstanceServices.GetRequiredService<IMemoryCache>(),
                context.InstanceServices.GetRequiredService<EvaluatorDbContext>(),
                parsedUserId,
                AccountCacheTtl);

            if (account.IsDeleted)
            {
                await Reject(context, req, HttpStatusCode.Forbidden, "This account is no longer active.");
                return;
            }

            context.Items["UserId"] = parsedUserId;
            // Deliberately the database's plan, not token.Claims["role"] — see the class summary.
            context.Items["Role"] = account.Plan;
        }

        await next(context);
    }

    /// <summary>Plan/deleted for a user, cached for <paramref name="ttl"/>. A missing row counts as
    /// deleted (fail closed). Extracted for unit tests.</summary>
    internal static async Task<AccountState> ResolveAccountStateAsync(
        IMemoryCache cache, EvaluatorDbContext db, Guid userId, TimeSpan ttl)
    {
        // Unlike the rate limiter's counter, a raced factory here is harmless: both threads run
        // the same read-only query and produce equal values, so no lock is needed.
        return (await cache.GetOrCreateAsync($"acct:{userId}", async entry =>
        {
            entry.AbsoluteExpirationRelativeToNow = ttl;
            return await db.Users
                .AsNoTracking()
                .Where(u => u.UserId == userId)
                .Select(u => new AccountState(u.Plan, u.IsDeleted))
                .FirstOrDefaultAsync()
                ?? new AccountState("Free", IsDeleted: true);
        }))!;
    }

    private static async Task Reject(FunctionContext context, HttpRequestData req, HttpStatusCode status, string message)
    {
        var res = req.CreateResponse(status);
        // Not WriteAsJsonAsync: it forces 200 and starts the response, so the status can't be restored.
        res.Headers.Add("Content-Type", "application/json; charset=utf-8");
        await res.WriteStringAsync(JsonSerializer.Serialize(new { message }));
        context.GetInvocationResult().Value = res;
    }
}
