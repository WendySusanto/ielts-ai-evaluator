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

    public SpeechToken(ISpeechTokenService service) => _service = service;

    [Function("SpeechToken_Get")]
    public async Task<IActionResult> GetTokenAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "speech/token")] HttpRequest req)
    {
        var dto = await _service.GetTokenAsync();
        return new OkObjectResult(dto);
    }
}
