using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Extensions.Configuration;

// For .NET 8 isolated functions, using IHostBuilder gives you the flexibility
// to configure middleware like CORS.
var host = new HostBuilder()
    // This configures the function's application pipeline to use ASP.NET Core integration.
    .ConfigureFunctionsWebApplication()
    // This is where you register all your services for dependency injection.
    .ConfigureServices((context, services) =>
    {
        // --- Step 1: Add CORS services and define the policy ---
        services.AddCors(options =>
        {
            // We'll define a "default" policy. This is simplest to apply.
            // When using ConfigureFunctionsWebApplication, the CORS middleware is
            // automatically discovered and used. You do not need to call "UseCors()".
            options.AddDefaultPolicy(policy =>
            {
                // Define the allowed origins. For production, you should be
                // more specific than using a wildcard.
                policy.WithOrigins("http://localhost:5173", "http://localhost:3000")
                      .AllowAnyHeader() // Allows all request headers.
                      .AllowAnyMethod() // Allows all HTTP methods (GET, POST, etc.)
                      .AllowCredentials(); // Important for front-ends sending credentials.
            });
        });

        // --- Step 2: Register your other application services ---
        var connectionString = context.Configuration["DbConnectionString"];

        services.AddDbContext<EvaluatorDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddHttpClient<IGeminiApiClient, GeminiApiClient>();
        services.AddScoped<IEssayEvaluationService, EssayEvaluationService>();
        services.AddScoped<IWritingPromptService, WritingPromptService>();
        services.AddScoped<IUserService, UserService>();

        // --- Step 3: (Optional) Application Insights registration ---
        // services.AddApplicationInsightsTelemetryWorkerService();
        // services.ConfigureFunctionsApplicationInsights();
    })
    .Build();

host.Run();



//with this below program.cs we can run the migrations
//using IELTS.AI.Evaluator.Data.Models;
//using IELTS.AI.Evaluator.Functions.Services;
//using Microsoft.Azure.Functions.Worker.Builder;
//using Microsoft.EntityFrameworkCore;
//using Microsoft.Extensions.Configuration;
//using Microsoft.Extensions.DependencyInjection;
//using Microsoft.Extensions.Hosting;
//using Microsoft.Extensions.Options;


//var config = new ConfigurationBuilder()
//  .SetBasePath(Directory.GetCurrentDirectory()) // important for CLI
//    .AddJsonFile("appsettings.json", optional: true, reloadOnChange: true)
//  .AddEnvironmentVariables()
//  .Build();

//var builder = FunctionsApplication.CreateBuilder(args);

//var connectionString = builder.Configuration.GetValue<string>("DbConnectionString");


//builder.Services.AddDbContext<EvaluatorDbContext>(options => options.UseNpgsql(connectionString));
//builder.Services.AddHttpClient<IGeminiApiClient, GeminiApiClient>();
//builder.Services.AddScoped<IEssayEvaluationService, EssayEvaluationService>();
//builder.Services.AddScoped<IWritingPromptService, WritingPromptService>();



//// Application Insights isn't enabled by default. See https://aka.ms/AAt8mw4.
//// builder.Services
////     .AddApplicationInsightsTelemetryWorkerService()
////     .ConfigureFunctionsApplicationInsights();

//builder.Build().Run();