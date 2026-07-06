using FirebaseAdmin.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using System.Net;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Token-only auth: verifies the Firebase ID token and reads identity from
/// custom claims. No database access — /api/auth/sync owns user provisioning.</summary>
public class FirebaseAuthenticationMiddleware : IFunctionsWorkerMiddleware
{
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
            context.Items["UserId"] = Guid.Parse(token.Claims["userId"].ToString()!);
            context.Items["Role"] = token.Claims.TryGetValue("role", out var r) ? r?.ToString() ?? "Free" : "Free";
        }

        await next(context);
    }

    private static async Task Reject(FunctionContext context, HttpRequestData req, HttpStatusCode status, string message)
    {
        var res = req.CreateResponse(status);
        await res.WriteAsJsonAsync(new { message });
        res.StatusCode = status;
        context.GetInvocationResult().Value = res;
    }
}
