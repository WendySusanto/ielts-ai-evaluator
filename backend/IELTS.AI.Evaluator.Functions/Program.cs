using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Middleware;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

//For.NET 8 isolated functions, using IHostBuilder gives you the flexibility
// to configure middleware like CORS.
var host = new HostBuilder()
    // This configures the function's application pipeline to use ASP.NET Core integration.
    .ConfigureFunctionsWebApplication(builder =>
    {
        builder.UseMiddleware<ExceptionHandlingMiddleware>();
        builder.UseMiddleware<FirebaseAuthenticationMiddleware>();
    })
    // This is where you register all your services for dependency injection.
    .ConfigureServices((context, services) =>
    {
        // --- Step 1: Add CORS services and define the policy ---
        services.AddCors(options =>
        {
            // Comma-separated allowlist; add the production URL to Azure App Settings at deploy time,
            // e.g. "http://localhost:5173,https://your-production-domain.example"
            var allowedOrigins = (Environment.GetEnvironmentVariable("AllowedOrigins") ?? "http://localhost:5173")
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

            options.AddDefaultPolicy(policy =>
            {
                policy.WithOrigins(allowedOrigins)
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        // --- Step 2: Register your other application services ---
        //var connectionString = context.Configuration["DbConnectionString"];
        var connectionString = Environment.GetEnvironmentVariable("DbConnectionString");

        services.AddDbContext<EvaluatorDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddHttpClient<IGeminiApiClient, GeminiApiClient>();
        services.AddHttpClient<IGeminiStructuredClient, GeminiStructuredClient>();
        services.AddScoped<IEssayEvaluationService, EssayEvaluationService>();
        services.AddScoped<IWritingService, WritingService>();
        services.AddScoped<ISpeakingService, SpeakingService>();
        services.AddScoped<IWritingPromptService, WritingPromptService>();
        services.AddScoped<ISpeakingPromptService, SpeakingPromptService>();
        services.AddScoped<ISpeakingEvaluationService, SpeakingEvaluationService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAuthSyncService, AuthSyncService>();

        // initialize FirebaseApp once using JSON from env (or KeyVault)
        var firebaseJson = Environment.GetEnvironmentVariable("FIREBASE_SERVICE_ACCOUNT_JSON")
                          ?? throw new InvalidOperationException("FIREBASE_SERVICE_ACCOUNT_JSON not set");
        var projectId = Environment.GetEnvironmentVariable("FIREBASE_PROJECT_ID");

        var googleCred = GoogleCredential.FromJson(firebaseJson);
        // Create Firebase app (only once)
        var options = new AppOptions { Credential = googleCred, ProjectId = projectId };
        var app = FirebaseApp.Create(options);

        // register the app if you want to inject it later
        services.AddSingleton(app);
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