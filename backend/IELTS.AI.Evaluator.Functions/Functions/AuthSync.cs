using FirebaseAdmin.Auth;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

public class AuthSync
{
    private readonly IAuthSyncService _authSync;

    public AuthSync(IAuthSyncService authSync) => _authSync = authSync;

    [Function("AuthSync")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/sync")] HttpRequest req,
        FunctionContext context)
    {
        // Middleware verified the token and stashed it for us.
        var token = (FirebaseToken)context.Items["FirebaseToken"]!;
        var email = token.Claims.TryGetValue("email", out var e) ? e?.ToString() : null;
        var name = token.Claims.TryGetValue("name", out var n) ? n?.ToString() : null;

        var (profile, setClaims, userId, role) = await _authSync.SyncAsync(token.Uid, email, name, token.Claims);

        if (setClaims)
        {
            await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(token.Uid,
                new Dictionary<string, object> { ["userId"] = userId.ToString(), ["role"] = role });
        }

        return new OkObjectResult(profile);
    }
}
