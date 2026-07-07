using System.Net;
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

            var (status, message, isDomain) = Map(ex);
            if (!isDomain) _logger.LogError(ex, "Unhandled exception");

            var res = req.CreateResponse((HttpStatusCode)status);
            await res.WriteAsJsonAsync(new { message });
            res.StatusCode = (HttpStatusCode)status; // WriteAsJsonAsync resets to 200
            context.GetInvocationResult().Value = res;
        }
    }

    /// <summary>Exception → (status, message). DomainException (possibly wrapped one level deep,
    /// e.g. by the worker's invocation pipeline) maps to its own status/message; anything else
    /// is a bare 500 with no detail leaked. Extracted so the wire mapping is unit-testable
    /// without faking the isolated-worker HTTP types.</summary>
    internal static (int Status, string Message, bool IsDomain) Map(Exception ex)
    {
        var domain = (ex as DomainException) ?? (ex.InnerException as DomainException);
        return (domain?.StatusCode ?? 500, domain?.Message ?? "Internal server error", domain is not null);
    }
}
