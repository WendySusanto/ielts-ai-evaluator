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

var host = new HostBuilder()
    // This configures the function's application pipeline to use ASP.NET Core integration.
    .ConfigureFunctionsWebApplication(builder =>
    {
        builder.UseMiddleware<ExceptionHandlingMiddleware>();
        builder.UseMiddleware<FirebaseAuthenticationMiddleware>();
        // Must follow authentication: it keys the window on the verified Firebase uid.
        builder.UseMiddleware<RateLimitMiddleware>();
    })
    // This is where you register all your services for dependency injection.
    .ConfigureServices((context, services) =>
    {
        // CORS is enforced by the Functions host, not the worker: Host.CORS in local.settings.json
        // for dev; portal CORS settings in production. An in-worker AddCors policy is never applied.

        services.AddMemoryCache(); // backs RateLimitMiddleware's per-user windows

        var connectionString = Environment.GetEnvironmentVariable("DbConnectionString");

        services.AddDbContext<EvaluatorDbContext>(options =>
            options.UseNpgsql(connectionString));

        // HttpClient.Timeout is one number for every call, but an examiner turn should give up after
        // 45s while a scoring call may need 150s — so the real per-attempt limits live in
        // GeminiStructuredClient. This is only a backstop above the longest of them.
        services.AddHttpClient<IGeminiStructuredClient, GeminiStructuredClient>(
            c => c.Timeout = TimeSpan.FromMinutes(3));
        // STS token issuance is one small POST; if it hasn't answered in 10s it isn't going to.
        services.AddHttpClient<ISpeechTokenService, SpeechTokenService>(
            c => c.Timeout = TimeSpan.FromSeconds(10));
        services.AddScoped<IWritingService, WritingService>();
        services.AddScoped<ISpeakingService, SpeakingService>();
        // One client for the process: BlobContainerClient is thread-safe and holds no per-request state.
        services.AddSingleton<IAudioStore, BlobAudioStore>();
        services.AddScoped<IExaminerService, ExaminerService>();
        services.AddScoped<IWritingPromptService, WritingPromptService>();
        services.AddScoped<ISpeakingPromptService, SpeakingPromptService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IDashboardService, DashboardService>();
        services.AddScoped<IAuthSyncService, AuthSyncService>();
        services.AddScoped<INotebookService, NotebookService>();

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
