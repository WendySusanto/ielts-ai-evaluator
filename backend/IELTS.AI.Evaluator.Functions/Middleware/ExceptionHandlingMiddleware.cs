using System.Net;
using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Maps DomainException to its status code; anything else to a bare 500.</summary>
public class ExceptionHandlingMiddleware : IFunctionsWorkerMiddleware
{
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(ILogger<ExceptionHandlingMiddleware> logger) => _logger = logger;

    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            var req = await context.GetHttpRequestDataAsync();
            if (req is null) throw; // non-HTTP trigger: let the host handle it

            var domain = (ex as DomainException) ?? (ex.InnerException as DomainException);
            var status = domain?.StatusCode ?? 500;
            var message = domain?.Message ?? "Internal server error";
            if (domain is null) _logger.LogError(ex, "Unhandled exception");

            var res = req.CreateResponse((HttpStatusCode)status);
            var json = JsonSerializer.Serialize(new { message });
            await res.WriteStringAsync(json);
            context.GetInvocationResult().Value = res;
        }
    }
}
