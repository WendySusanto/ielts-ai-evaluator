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

            var (status, message, isDomain) = Map(ex);
            if (!isDomain) _logger.LogError(ex, "Unhandled exception");

            // Response already streaming (e.g. failed during serialization): it can't be rewritten, so just log.
            if (context.GetHttpContext()?.Response.HasStarted == true)
            {
                _logger.LogError(ex, "Exception after response started; response cannot be rewritten");
                return;
            }

            var res = req.CreateResponse((HttpStatusCode)status);
            // Not WriteAsJsonAsync: it forces 200 and, under ASP.NET Core integration, starts the
            // response — so setting StatusCode afterwards throws.
            res.Headers.Add("Content-Type", "application/json; charset=utf-8");
            await res.WriteStringAsync(JsonSerializer.Serialize(new { message }));
            context.GetInvocationResult().Value = res;
        }
    }

    /// <summary>Exception → (status, message): a DomainException (or one wrapped one level deep) keeps
    /// its own; anything else is a bare 500. Extracted for unit tests.</summary>
    internal static (int Status, string Message, bool IsDomain) Map(Exception ex)
    {
        var domain = (ex as DomainException) ?? (ex.InnerException as DomainException);
        return (domain?.StatusCode ?? 500, domain?.Message ?? "Internal server error", domain is not null);
    }
}
