using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 Azure Speech token endpoint. No try/catch: missing config throws, and the exception
/// middleware turns it into a bare 500.</summary>
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
        var dto = await _service.GetTokenAsync(context.CancellationToken);

        // Audit row: written after the token is issued, never swallowed or cancelled — once a spendable
        // token has left, this is the only trace that this user could spend.
        _db.SpeechTokenIssues.Add(new SpeechTokenIssue { UserId = context.GetUserId()!.Value });
        await _db.SaveChangesAsync(CancellationToken.None);

        return new OkObjectResult(dto);
    }
}
