using FirebaseAdmin.Auth;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Security.Claims;

namespace IELTS.AI.Evaluator.Functions.Middleware;

public class FirebaseAuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<FirebaseAuthenticationMiddleware> _logger;

    public FirebaseAuthenticationMiddleware(ILogger<FirebaseAuthenticationMiddleware> logger)
    {
        _logger = logger;
    }

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();
        if (req == null)
        {
            await next(context);
            return;
        }

        if (!req.Headers.TryGetValues("Authorization", out var authValues))
        {
            await WriteUnauthorized(context, req, "Missing Authorization header");
            return;
        }

        var authHeader = authValues.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(authHeader) || !authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            await WriteUnauthorized(context, req, "Invalid Authorization header");
            return;
        }

        var idToken = authHeader.Substring("Bearer ".Length).Trim();

        try
        {
            // Resolve the scoped user service per request
            var userService = context.InstanceServices.GetRequiredService<IUserService>();

            var decodedToken = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken, true);
            var firebaseUid = decodedToken.Uid;
            var email = GetClaimValue(decodedToken, "email");
            var fullName = await GetFirebaseDisplayNameAsync(firebaseUid)
                           ?? GetClaimValue(decodedToken, "fullName");

            bool claimsUpdated = false;

            // Get or create user using the service
            var user = await userService.GetOrCreateUserAsync(firebaseUid, email, fullName);
            if (user == null)
            {
                await WriteUnauthorized(context, req, "User creation failed");
                return;
            }

            // This claim will be available in the firebase token
            var requiredClaims = new Dictionary<string, object>()
            {
                { "role", DetermineUserRole(user.Plan) },
                { "fullName", user.FullName ?? "" },
                { "userId", user.UserId }
            };

            bool needsUpdate = requiredClaims
                .Any(rc => !decodedToken.Claims.ContainsKey(rc.Key) || !decodedToken.Claims[rc.Key]!.Equals(rc.Value));

            if (needsUpdate)
            {
                //this update the claim in the token that can be used in the frontend
                await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(firebaseUid, requiredClaims);
                claimsUpdated = true;
                _logger.LogInformation("Custom claims updated for {Uid}", firebaseUid);
            }

            // Add local claims for this request
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Role, DetermineUserRole(user.Plan))
            };
            if (!string.IsNullOrEmpty(user.Email))
                claims.Add(new Claim(ClaimTypes.Email, user.Email));
            if (!string.IsNullOrEmpty(user.FullName))
                claims.Add(new Claim(ClaimTypes.Name, user.FullName));

            var identity = new ClaimsIdentity(claims, "Firebase");
            var principal = new ClaimsPrincipal(identity);

            //Can be used in the function level
            context.Items["User"] = principal;
            context.Items["UserId"] = user.UserId;
            context.Items["FirebaseUid"] = user.FirebaseUid;
            context.Items["FullName"] = user.FullName;
            context.Items["Email"] = user.Email;
            context.Items["AuthProvider"] = user.AuthProvider;
            context.Items["UserPlan"] = user.Plan;
            context.Items["WritingQuotaUsed"] = user.WritingQuotaUsed;
            context.Items["SpeakingQuotaUsed"] = user.SpeakingQuotaUsed;
            context.Items["IELTSTargetType"] = user.IELTSTargetType;
            context.Items["IELTSTargetScore"] = user.IELTSTargetScore;
            context.Items["TargetTestDate"] = user.TargetTestDate;
            context.Items["LastLogin"] = user.LastLogin;
            context.Items["CreatedAt"] = user.CreatedAt;
            context.Items["UpdatedAt"] = user.UpdatedAt;
            context.Items["ClaimsUpdated"] = claimsUpdated;

            await next(context);
        }
        catch (FirebaseAuthException)
        {
            await WriteUnauthorized(context, req, "Invalid or revoked token");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in Firebase authentication");
            var r = req.CreateResponse(HttpStatusCode.InternalServerError);
            await r.WriteStringAsync("Authentication error");
            context.GetInvocationResult().Value = r;
        }
    }

    private async Task WriteUnauthorized(FunctionContext context, HttpRequestData req, string message)
    {
        var r = req.CreateResponse(HttpStatusCode.Unauthorized);
        await r.WriteStringAsync(message);
        context.GetInvocationResult().Value = r;
    }

    private string? GetClaimValue(FirebaseToken token, string claimName) =>
        token.Claims.TryGetValue(claimName, out var val) ? val?.ToString() : null;

    private async Task<string?> GetFirebaseDisplayNameAsync(string firebaseUid)
    {
        try
        {
            var userRecord = await FirebaseAuth.DefaultInstance.GetUserAsync(firebaseUid);
            return userRecord.DisplayName;
        }
        catch
        {
            return null;
        }
    }

    private string DetermineUserRole(string? plan) =>
        plan?.ToLower() switch
        {
            "admin" => "Admin",
            "premium" => "Premium",
            _ => "Free"
        };
}
