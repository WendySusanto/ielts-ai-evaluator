using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions;

public class DiagnoseConfig
{
    private readonly IConfiguration _configuration;

    public DiagnoseConfig(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    [Function("DiagnoseConfig")]
    public IActionResult Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequest req)
    {
        // Try to read the connection string from configuration
        var connectionString = _configuration["DbConnectionString"];

        if (string.IsNullOrEmpty(connectionString))
        {
            return new OkObjectResult("Result: Connection String is NULL or Empty.");
        }

        return new OkObjectResult($"Result: Success! Found connection string: {connectionString}");
    }
}