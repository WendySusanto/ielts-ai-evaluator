using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 Azure Speech token endpoint. Thin: no try/catch — missing configuration
/// surfaces as InvalidOperationException, which the exception middleware maps to a bare
/// 500 (message logged there, not exposed on the wire).</summary>
public class SpeechToken
{
    private readonly ISpeechTokenService _service;
    private readonly EvaluatorDbContext _db;

    public SpeechToken(ISpeechTokenService service, EvaluatorDbContext db)
    {
        _service = service;
        _db = db;
    }

    [Function("SpeechToken_Get")]
    public async Task<IActionResult> GetTokenAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "speech/token")] HttpRequest req,
        FunctionContext context)
    {
        var dto = await _service.GetTokenAsync();

        // Audit, not business logic — the token works directly against Azure, so this row is the
        // only trace that this user could spend. Written after the token is issued so a failed
        // Azure call doesn't leave a phantom entry, and deliberately not swallowed: an audit that
        // fails silently is worse than a failed request.
        _db.SpeechTokenIssues.Add(new SpeechTokenIssue { UserId = context.GetUserId()!.Value });
        await _db.SaveChangesAsync();

        return new OkObjectResult(dto);
    }
}
