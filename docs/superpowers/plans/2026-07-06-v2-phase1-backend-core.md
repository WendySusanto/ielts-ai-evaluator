# v2 Phase 1 — Backend Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the backend core for v2: fresh DB schema (jsonb feedback, `speaking_sessions`), token-only auth middleware + `/api/auth/sync`, plain-HTTP API contract (no `{success,message,data}` envelope), and Gemini structured JSON output for both writing and one-shot speaking evaluation.

**Architecture:** .NET 8 isolated Azure Functions + EF Core/Npgsql. Tasks are **additive-first**: new v2 entities/services land beside the old ones so `dotnet build` stays green after every task; the final cutover task deletes old entities/DTOs, drops all existing migrations, and generates one fresh `InitialCreate`. Services throw typed domain exceptions; a new exception-handling middleware maps them to HTTP statuses, killing per-function try/catch and message-string matching.

**Tech Stack:** C#/.NET 8, EF Core 9 + Npgsql, xUnit + EF InMemory (existing test project), Gemini REST API with `responseSchema`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-v2-requirements.md` (sections 3–7, 9, 12).
- API contract: 2xx → DTO directly; errors → status code + `{ "message": string }`. Statuses: 400 validation, 401 unauthenticated, 403 forbidden/uninitialised, 404 not found (also not-owner), 429 quota, 500 `{ "message": "Internal server error" }` — never details.
- Auth: middleware verifies Firebase ID token only (no DB); identity from custom claims `userId` (Guid string) + `role` (`Free`|`Premium`|`Admin`). Only `POST /api/auth/sync` touches the DB for identity.
- Quotas carry forward: Free 10 writing + 10 speaking per UTC day (`DailyWritingQuota`/`DailySpeakingQuota`, default 10), Premium/Admin unlimited, checked **before** any Gemini call. Input caps: essay 10,000 chars; transcript 20,000 chars.
- Gemini: `responseMimeType: "application/json"` + `responseSchema` on every call. No markdown-fence parsing anywhere in v2 code.
- Feedback stored as jsonb (`string` property + `HasColumnType("jsonb")`) containing the parsed structured result — never the raw Gemini HTTP response.
- Build (`dotnet build backend/IELTS.AI.Evaluator.sln`) and full test suite (`dotnet test backend/IELTS.AI.Evaluator.sln`) must pass after every task.
- The frontend keeps talking to the old endpoints until Phase 2; breaking the old envelope is expected and accepted from Task 6 onward (v2 development mode).

---

### Task 1: v2 entities + DbSets (additive)

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Data/Models/WritingEvaluation.cs`
- Create: `backend/IELTS.AI.Evaluator.Data/Models/SpeakingSession.cs`
- Modify: `backend/IELTS.AI.Evaluator.Data/Models/EvaluatorDbContext.cs` (add DbSets + model config; leave old entities in place)
- Modify: `backend/IELTS.AI.Evaluator.Data/Models/WritingPrompt.cs`, `SpeakingPrompt.cs` (add `IsActive`)

**Interfaces:**
- Produces (later tasks depend on these exact shapes):

```csharp
// WritingEvaluation.cs
namespace IELTS.AI.Evaluator.Data.Models
{
    public class WritingEvaluation : BaseEntity
    {
        public Guid WritingEvaluationId { get; set; }
        public Guid UserId { get; set; }
        public Guid WritingPromptId { get; set; }
        public User User { get; set; } = default!;
        public WritingPrompt WritingPrompt { get; set; } = default!;
        public string EssayText { get; set; } = default!;
        public int WordCount { get; set; }
        public decimal OverallBand { get; set; }
        /// <summary>Parsed structured Gemini feedback (WritingFeedback shape), stored as jsonb.</summary>
        public string Feedback { get; set; } = default!;
        public string AiModel { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}

// SpeakingSession.cs
namespace IELTS.AI.Evaluator.Data.Models
{
    public class SpeakingSession : BaseEntity
    {
        public Guid SpeakingSessionId { get; set; }
        public Guid UserId { get; set; }
        public Guid SpeakingPromptId { get; set; }
        public User User { get; set; } = default!;
        public SpeakingPrompt SpeakingPrompt { get; set; } = default!;
        public string Part { get; set; } = default!; // "Part1" | "Part2" | "Part3"
        /// <summary>Ordered conversation turns [{role:"examiner"|"candidate",text:string}], jsonb.</summary>
        public string Turns { get; set; } = default!;
        public decimal OverallBand { get; set; }
        /// <summary>Parsed structured Gemini feedback (SpeakingFeedback shape), jsonb.</summary>
        public string Feedback { get; set; } = default!;
        /// <summary>Azure Pronunciation Assessment result, jsonb. Null until Phase 4.</summary>
        public string? Pronunciation { get; set; }
        public string AiModel { get; set; } = string.Empty;
        public int PromptTokens { get; set; }
        public int CompletionTokens { get; set; }
    }
}
```

- [ ] **Step 1: Create the two entity files** with the code above.

- [ ] **Step 2: Add `IsActive` to both prompt entities**

In `WritingPrompt.cs` and `SpeakingPrompt.cs` add:

```csharp
public bool IsActive { get; set; } = true;
```

- [ ] **Step 3: Register in EvaluatorDbContext**

Add DbSets:

```csharp
public DbSet<WritingEvaluation> WritingEvaluations => Set<WritingEvaluation>();
public DbSet<SpeakingSession> SpeakingSessions => Set<SpeakingSession>();
```

Add to `OnModelCreating` (after the existing key configs):

```csharp
modelBuilder.Entity<WritingEvaluation>(e =>
{
    e.HasKey(x => x.WritingEvaluationId);
    e.Property(x => x.Feedback).HasColumnType("jsonb");
    e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(x => x.WritingPrompt).WithMany().HasForeignKey(x => x.WritingPromptId).OnDelete(DeleteBehavior.Restrict);
    e.HasIndex(x => new { x.UserId, x.CreatedAt });
});

modelBuilder.Entity<SpeakingSession>(e =>
{
    e.HasKey(x => x.SpeakingSessionId);
    e.Property(x => x.Turns).HasColumnType("jsonb");
    e.Property(x => x.Feedback).HasColumnType("jsonb");
    e.Property(x => x.Pronunciation).HasColumnType("jsonb");
    e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
    e.HasOne(x => x.SpeakingPrompt).WithMany().HasForeignKey(x => x.SpeakingPromptId).OnDelete(DeleteBehavior.Restrict);
    e.HasIndex(x => new { x.UserId, x.CreatedAt });
});
```

Note: do NOT add a migration in this task — the schema is regenerated from scratch in the cutover task (Task 8). EF InMemory tests ignore `HasColumnType("jsonb")`, so tests work throughout.

- [ ] **Step 4: Build + full suite**

Run: `dotnet build backend/IELTS.AI.Evaluator.sln` then `dotnet test backend/IELTS.AI.Evaluator.sln`
Expected: build clean; existing 10 tests still pass.

- [ ] **Step 5: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Data
git commit -m "v2: add WritingEvaluation and SpeakingSession entities with jsonb feedback"
```

---

### Task 2: Domain exceptions + exception-handling middleware

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Functions/Exceptions/DomainExceptions.cs`
- Create: `backend/IELTS.AI.Evaluator.Functions/Middleware/ExceptionHandlingMiddleware.cs`
- Modify: `backend/IELTS.AI.Evaluator.Functions/Program.cs` (register middleware FIRST in the pipeline)
- Test: `backend/IELTS.AI.Evaluator.Tests/DomainExceptionTests.cs`

**Interfaces:**
- Produces (all later service tasks throw these):

```csharp
namespace IELTS.AI.Evaluator.Functions.Exceptions;

public abstract class DomainException : Exception
{
    public abstract int StatusCode { get; }
    protected DomainException(string message) : base(message) { }
}

public sealed class ValidationException : DomainException
{
    public override int StatusCode => 400;
    public ValidationException(string message) : base(message) { }
}

public sealed class NotFoundException : DomainException
{
    public override int StatusCode => 404;
    public NotFoundException(string message) : base(message) { }
}

public sealed class QuotaExceededException : DomainException
{
    public override int StatusCode => 429;
    public QuotaExceededException(string message) : base(message) { }
}

public sealed class ForbiddenException : DomainException
{
    public override int StatusCode => 403;
    public ForbiddenException(string message) : base(message) { }
}
```

- [ ] **Step 1: Write the failing test**

`backend/IELTS.AI.Evaluator.Tests/DomainExceptionTests.cs`:

```csharp
using IELTS.AI.Evaluator.Functions.Exceptions;

namespace IELTS.AI.Evaluator.Tests;

public class DomainExceptionTests
{
    [Theory]
    [InlineData(typeof(ValidationException), 400)]
    [InlineData(typeof(NotFoundException), 404)]
    [InlineData(typeof(QuotaExceededException), 429)]
    [InlineData(typeof(ForbiddenException), 403)]
    public void StatusCodes_MatchContract(Type type, int expected)
    {
        var ex = (DomainException)Activator.CreateInstance(type, "boom")!;
        Assert.Equal(expected, ex.StatusCode);
        Assert.Equal("boom", ex.Message);
    }
}
```

- [ ] **Step 2: Run to verify it fails** — `dotnet test backend/IELTS.AI.Evaluator.sln --filter DomainExceptionTests` → FAIL (types don't exist).

- [ ] **Step 3: Create `DomainExceptions.cs`** with the code from Interfaces above.

- [ ] **Step 4: Create the middleware**

`ExceptionHandlingMiddleware.cs`:

```csharp
using System.Net;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.Azure.Functions.Worker;
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
            await res.WriteAsJsonAsync(new { message });
            res.StatusCode = (HttpStatusCode)status; // WriteAsJsonAsync resets to 200
            context.GetInvocationResult().Value = res;
        }
    }
}
```

(The `InnerException` check matters: the isolated worker can wrap function exceptions in `AggregateException`.)

- [ ] **Step 5: Register in Program.cs** — inside `ConfigureFunctionsWebApplication`, BEFORE the auth middleware:

```csharp
builder.UseMiddleware<ExceptionHandlingMiddleware>();
builder.UseMiddleware<FirebaseAuthenticationMiddleware>();
```

- [ ] **Step 6: Test + build** — `dotnet test backend/IELTS.AI.Evaluator.sln` → all pass (10 + 4 new).

- [ ] **Step 7: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: domain exceptions + exception-handling middleware (plain HTTP contract)"
```

---

### Task 3: Gemini client v2 — structured output

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Functions/Services/GeminiStructuredClient.cs`
- Test: `backend/IELTS.AI.Evaluator.Tests/GeminiStructuredClientTests.cs`

**Interfaces:**
- Produces:

```csharp
namespace IELTS.AI.Evaluator.Functions.Services;

public record GeminiResult<T>(T Value, string Model, int PromptTokens, int CompletionTokens);

public interface IGeminiStructuredClient
{
    /// <summary>Calls Gemini generateContent with responseMimeType=application/json and the given
    /// responseSchema (Gemini schema JSON as a string), deserializing the reply into T.</summary>
    Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson);
}
```

- Consumes config keys: `GeminiApiKey`, `GeminiApiEndpoint` (existing).

- [ ] **Step 1: Write the failing test**

`GeminiStructuredClientTests.cs` — fake `HttpMessageHandler` capturing the request and returning a canned Gemini response:

```csharp
using System.Net;
using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class GeminiStructuredClientTests
{
    private sealed record Verdict(string Grade, int Score);

    private sealed class CapturingHandler : HttpMessageHandler
    {
        public string? Body;
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken ct)
        {
            Body = await request.Content!.ReadAsStringAsync(ct);
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent(
                    """
                    {"candidates":[{"content":{"parts":[{"text":"{\"grade\":\"A\",\"score\":9}"}]}}],
                     "modelVersion":"gemini-test","usageMetadata":{"promptTokenCount":11,"candidatesTokenCount":7}}
                    """)
            };
        }
    }

    private static IConfiguration Config() => new ConfigurationBuilder()
        .AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiApiKey"] = "k",
            ["GeminiApiEndpoint"] = "https://example.test/v1beta/models/gemini:generateContent",
        }).Build();

    [Fact]
    public async Task GenerateAsync_SendsSchemaAndParsesTypedResult()
    {
        var handler = new CapturingHandler();
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);

        var result = await client.GenerateAsync<Verdict>("sys", "user text",
            """{"type":"OBJECT","properties":{"grade":{"type":"STRING"},"score":{"type":"INTEGER"}}}""");

        Assert.Equal("A", result.Value.Grade);
        Assert.Equal(9, result.Value.Score);
        Assert.Equal("gemini-test", result.Model);
        Assert.Equal(11, result.PromptTokens);
        Assert.Equal(7, result.CompletionTokens);

        using var sent = JsonDocument.Parse(handler.Body!);
        var genCfg = sent.RootElement.GetProperty("generationConfig");
        Assert.Equal("application/json", genCfg.GetProperty("responseMimeType").GetString());
        Assert.True(genCfg.TryGetProperty("responseSchema", out _));
        Assert.Equal("sys", sent.RootElement.GetProperty("systemInstruction").GetProperty("parts")[0].GetProperty("text").GetString());
    }

    [Fact]
    public async Task GenerateAsync_MalformedModelJson_Throws()
    {
        var handler = new CapturingHandler();
        // score as string breaks Verdict's int — handled by making T parse strict
        var client = new GeminiStructuredClient(new HttpClient(handler), Config(), NullLogger<GeminiStructuredClient>.Instance);
        await Assert.ThrowsAnyAsync<Exception>(() =>
            client.GenerateAsync<int[]>("sys", "user", """{"type":"ARRAY"}"""));
    }
}
```

- [ ] **Step 2: Run to verify it fails** — `dotnet test --filter GeminiStructuredClientTests` → FAIL.

- [ ] **Step 3: Implement**

`GeminiStructuredClient.cs`:

```csharp
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public class GeminiStructuredClient : IGeminiStructuredClient
{
    private static readonly JsonSerializerOptions CamelCase = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _http;
    private readonly IConfiguration _config;
    private readonly ILogger<GeminiStructuredClient> _logger;

    public GeminiStructuredClient(HttpClient http, IConfiguration config, ILogger<GeminiStructuredClient> logger)
    {
        _http = http;
        _config = config;
        _logger = logger;
    }

    public async Task<GeminiResult<T>> GenerateAsync<T>(string systemInstruction, string userContent, string responseSchemaJson)
    {
        var apiKey = _config["GeminiApiKey"];
        var endpoint = _config["GeminiApiEndpoint"];
        if (string.IsNullOrWhiteSpace(apiKey) || string.IsNullOrWhiteSpace(endpoint))
            throw new InvalidOperationException("Gemini configuration missing");

        using var schema = JsonDocument.Parse(responseSchemaJson);
        var payload = new
        {
            systemInstruction = new { parts = new[] { new { text = systemInstruction } } },
            contents = new[] { new { role = "user", parts = new[] { new { text = userContent } } } },
            generationConfig = new
            {
                responseMimeType = "application/json",
                responseSchema = schema.RootElement,
            },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json"),
        };
        request.Headers.Add("x-goog-api-key", apiKey);

        var response = await _http.SendAsync(request);
        var body = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            _logger.LogError("Gemini call failed: {Status} {Body}", (int)response.StatusCode, body);
            throw new HttpRequestException($"Gemini call failed with status {(int)response.StatusCode}");
        }

        using var doc = JsonDocument.Parse(body);
        var text = doc.RootElement.GetProperty("candidates")[0]
            .GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString()
            ?? throw new InvalidOperationException("Gemini returned empty content");

        var value = JsonSerializer.Deserialize<T>(text, CamelCase)
            ?? throw new InvalidOperationException("Gemini returned unparsable JSON");

        var model = doc.RootElement.TryGetProperty("modelVersion", out var m) ? m.GetString() ?? "" : "";
        var usage = doc.RootElement.TryGetProperty("usageMetadata", out var u) ? u : default;
        int Tok(string name) => usage.ValueKind == JsonValueKind.Object && usage.TryGetProperty(name, out var t) ? t.GetInt32() : 0;

        return new GeminiResult<T>(value, model, Tok("promptTokenCount"), Tok("candidatesTokenCount"));
    }
}
```

Register in `Program.cs` alongside the existing client (old one is removed in Task 8):

```csharp
services.AddHttpClient<IGeminiStructuredClient, GeminiStructuredClient>();
```

- [ ] **Step 4: Run tests** — `dotnet test backend/IELTS.AI.Evaluator.sln` → all pass.

- [ ] **Step 5: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: Gemini structured-output client (responseSchema, typed results)"
```

---

### Task 4: Auth v2 — /api/auth/sync + token-only middleware

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Functions/Functions/AuthSync.cs`
- Create: `backend/IELTS.AI.Evaluator.Functions/Services/AuthSyncService.cs`
- Rewrite: `backend/IELTS.AI.Evaluator.Functions/Middleware/FirebaseAuthenticationMiddleware.cs`
- Modify: `backend/IELTS.AI.Evaluator.Functions/Extensions/FunctionContextExtensions.cs` (trim to what v2 uses)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Program.cs` (register `IAuthSyncService`)
- Test: `backend/IELTS.AI.Evaluator.Tests/AuthSyncServiceTests.cs`

**Interfaces:**
- Produces:

```csharp
public record AuthProfileDto(Guid UserId, string Email, string FullName, string Plan,
    decimal? IeltsTargetScore, DateTimeOffset? TargetTestDate, bool ClaimsRefreshRequired);

public interface IAuthSyncService
{
    /// <summary>Get-or-create the user for this Firebase identity, update last_login,
    /// and report whether custom claims must be (re)set. DB-free callers use claims only.</summary>
    Task<(AuthProfileDto Profile, bool SetClaims, Guid UserId, string Role)> SyncAsync(
        string firebaseUid, string? email, string? fullName, IReadOnlyDictionary<string, object> existingClaims);
}
```

- Middleware contract (consumed by every later task): `context.Items["UserId"]` = `Guid`, `context.Items["Role"]` = `string`. Existing helpers `GetUserId()`, `GetUserRole()`, `IsAdmin()`, `IsPremiumUser()` keep working; all other Get* helpers and their Items keys are deleted.

- [ ] **Step 1: Write the failing tests**

`AuthSyncServiceTests.cs` (InMemory DB, no Firebase — the service is pure DB + claims-diff logic; the Firebase Admin calls live in the Function):

```csharp
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class AuthSyncServiceTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public async Task NewFirebaseUser_CreatesRow_AndRequestsClaims()
    {
        var db = NewDb();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (profile, setClaims, userId, role) = await svc.SyncAsync(
            "uid-1", "a@b.c", "Alice", new Dictionary<string, object>());

        Assert.True(setClaims);
        Assert.Equal("Free", role);
        Assert.Equal("a@b.c", profile.Email);
        Assert.Single(db.Users.Where(u => u.FirebaseUid == "uid-1"));
        Assert.Equal(userId, db.Users.Single().UserId);
    }

    [Fact]
    public async Task ExistingUser_WithMatchingClaims_DoesNotRequestClaims()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "uid-1", Email = "a@b.c", FullName = "Alice", Plan = "Free" };
        db.Users.Add(user);
        db.SaveChanges();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (_, setClaims, userId, role) = await svc.SyncAsync("uid-1", "a@b.c", "Alice",
            new Dictionary<string, object> { ["userId"] = user.UserId.ToString(), ["role"] = "Free" });

        Assert.False(setClaims);
        Assert.Equal(user.UserId, userId);
        Assert.Equal("Free", role);
    }

    [Fact]
    public async Task PlanChanged_RequestsClaimRefresh()
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "uid-1", Email = "a@b.c", FullName = "Alice", Plan = "Premium" };
        db.Users.Add(user);
        db.SaveChanges();
        var svc = new AuthSyncService(db, NullLogger<AuthSyncService>.Instance);

        var (profile, setClaims, _, role) = await svc.SyncAsync("uid-1", "a@b.c", "Alice",
            new Dictionary<string, object> { ["userId"] = user.UserId.ToString(), ["role"] = "Free" });

        Assert.True(setClaims);
        Assert.Equal("Premium", role);
        Assert.True(profile.ClaimsRefreshRequired);
    }
}
```

- [ ] **Step 2: Run to verify failure** — `dotnet test --filter AuthSyncServiceTests` → FAIL.

- [ ] **Step 3: Implement `AuthSyncService`**

```csharp
using IELTS.AI.Evaluator.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public class AuthSyncService : IAuthSyncService
{
    private readonly EvaluatorDbContext _db;
    private readonly ILogger<AuthSyncService> _logger;

    public AuthSyncService(EvaluatorDbContext db, ILogger<AuthSyncService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(AuthProfileDto, bool, Guid, string)> SyncAsync(
        string firebaseUid, string? email, string? fullName, IReadOnlyDictionary<string, object> existingClaims)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.FirebaseUid == firebaseUid);
        if (user is null)
        {
            user = new User
            {
                UserId = Guid.NewGuid(),
                FirebaseUid = firebaseUid,
                Email = email ?? string.Empty,
                FullName = fullName ?? string.Empty,
                Plan = "Free",
            };
            _db.Users.Add(user);
            _logger.LogInformation("Created user for Firebase uid {Uid}", firebaseUid);
        }
        else
        {
            if (string.IsNullOrEmpty(user.Email) && !string.IsNullOrEmpty(email)) user.Email = email;
            if (string.IsNullOrEmpty(user.FullName) && !string.IsNullOrEmpty(fullName)) user.FullName = fullName;
        }

        user.LastLogin = DateTimeOffset.UtcNow;
        await _db.SaveChangesAsync();

        var role = user.Plan;
        var claimsMatch =
            existingClaims.TryGetValue("userId", out var cu) && cu?.ToString() == user.UserId.ToString() &&
            existingClaims.TryGetValue("role", out var cr) && cr?.ToString() == role;

        var profile = new AuthProfileDto(user.UserId, user.Email, user.FullName, user.Plan,
            user.IELTSTargetScore == 0 ? null : user.IELTSTargetScore,
            user.TargetTestDate == default ? null : user.TargetTestDate,
            ClaimsRefreshRequired: !claimsMatch);

        return (profile, !claimsMatch, user.UserId, role);
    }
}
```

- [ ] **Step 4: Create the AuthSync function**

`Functions/AuthSync.cs` — the ONLY endpoint the new middleware lets through without a `userId` claim:

```csharp
using FirebaseAdmin.Auth;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

public class AuthSync
{
    private readonly IAuthSyncService _authSync;

    public AuthSync(IAuthSyncService authSync) => _authSync = authSync;

    [Function("AuthSync")]
    public async Task<IActionResult> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/sync")] HttpRequest req,
        FunctionContext context)
    {
        // Middleware verified the token and stashed it for us.
        var token = (FirebaseToken)context.Items["FirebaseToken"]!;
        var email = token.Claims.TryGetValue("email", out var e) ? e?.ToString() : null;
        var name = token.Claims.TryGetValue("name", out var n) ? n?.ToString() : null;

        var (profile, setClaims, userId, role) = await _authSync.SyncAsync(token.Uid, email, name, token.Claims);

        if (setClaims)
        {
            await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(token.Uid,
                new Dictionary<string, object> { ["userId"] = userId.ToString(), ["role"] = role });
        }

        return new OkObjectResult(profile);
    }
}
```

- [ ] **Step 5: Rewrite the middleware**

Replace the entire body of `FirebaseAuthenticationMiddleware.cs`:

```csharp
using FirebaseAdmin.Auth;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Azure.Functions.Worker.Middleware;
using System.Net;

namespace IELTS.AI.Evaluator.Functions.Middleware;

/// <summary>Token-only auth: verifies the Firebase ID token and reads identity from
/// custom claims. No database access — /api/auth/sync owns user provisioning.</summary>
public class FirebaseAuthenticationMiddleware : IFunctionsWorkerMiddleware
{
    public async Task Invoke(FunctionContext context, FunctionExecutionDelegate next)
    {
        var req = await context.GetHttpRequestDataAsync();
        if (req is null) { await next(context); return; }

        var header = req.Headers.TryGetValues("Authorization", out var v) ? v.FirstOrDefault() : null;
        if (header is null || !header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
        {
            await Reject(context, req, HttpStatusCode.Unauthorized, "Missing bearer token");
            return;
        }

        FirebaseToken token;
        try
        {
            token = await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(header["Bearer ".Length..].Trim());
        }
        catch (FirebaseAuthException)
        {
            await Reject(context, req, HttpStatusCode.Unauthorized, "Invalid or expired token");
            return;
        }

        context.Items["FirebaseToken"] = token;

        var isSync = context.FunctionDefinition.Name == "AuthSync";
        var hasUserId = token.Claims.TryGetValue("userId", out var uid) && Guid.TryParse(uid?.ToString(), out var userId);
        if (!isSync)
        {
            if (!hasUserId)
            {
                await Reject(context, req, HttpStatusCode.Forbidden, "Account not initialised. Call /api/auth/sync.");
                return;
            }
            context.Items["UserId"] = Guid.Parse(token.Claims["userId"].ToString()!);
            context.Items["Role"] = token.Claims.TryGetValue("role", out var r) ? r?.ToString() ?? "Free" : "Free";
        }

        await next(context);
    }

    private static async Task Reject(FunctionContext context, HttpRequestData req, HttpStatusCode status, string message)
    {
        var res = req.CreateResponse(status);
        await res.WriteAsJsonAsync(new { message });
        res.StatusCode = status;
        context.GetInvocationResult().Value = res;
    }
}
```

Note: `VerifyIdTokenAsync` WITHOUT `checkRevoked: true` — the old `true` forced a network call per request; standard signature verification is local after the first JWKS fetch.

- [ ] **Step 6: Trim FunctionContextExtensions**

Keep only: `GetUserId()` (reads `Items["UserId"]` as `Guid?`), `GetUserRole()` (reads `Items["Role"]`), `IsAdmin()`, `IsPremiumUser()` (unchanged logic, but based on `GetUserRole()` reading Items["Role"] instead of ClaimsPrincipal). Delete every other helper and `GetUserData`. Compile errors in old functions (User.cs uses `WereClaimsUpdated`, `GetUser`) are fixed by updating those call sites: `User.cs` `GetUserProfile` drops the `ClaimsUpdated` line; any `GetUser()` ClaimsPrincipal usage in `WritingPrompt.cs`/`SpeakingPrompt.cs` switches to `context.GetUserId() == null` checks.

- [ ] **Step 7: Register service** — `services.AddScoped<IAuthSyncService, AuthSyncService>();` in Program.cs.

- [ ] **Step 8: Build + full suite** — everything green.

- [ ] **Step 9: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: token-only auth middleware + /api/auth/sync (no per-request DB access)"
```

---

### Task 5: Writing v2 — deep feedback schema, service, endpoints

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Functions/DTOs/WritingFeedback.cs` (typed feedback shape + Gemini schema constant + prompt)
- Create: `backend/IELTS.AI.Evaluator.Functions/Services/WritingService.cs` (replaces EssayEvaluationService for v2 routes)
- Create: `backend/IELTS.AI.Evaluator.Functions/Functions/WritingV2.cs`
- Test: `backend/IELTS.AI.Evaluator.Tests/WritingServiceTests.cs`

**Interfaces:**
- Produces the v2 writing endpoints (old `/api/writing/evaluate` etc. remain until Task 8):
  - `POST /api/v2/writing/evaluations` body `{ writingPromptId, essayText }` → 200 `WritingEvaluationDto`
  - `GET /api/v2/writing/evaluations` → 200 `WritingHistoryItemDto[]`
  - `GET /api/v2/writing/evaluations/{id}` → 200 `WritingEvaluationDetailDto` (404 if absent/not owner)
- Feedback shape (also the contract for the Phase 3 feedback screens — camelCase on the wire):

```csharp
public record WritingCriterion(string Name, decimal Band, string Justification,
    List<string> Examples, List<string> Improvements);
public record WritingError(string Quote, string Correction, string Rule);
public record VocabularyUpgrade(string Original, string Upgrade, string Context);
public record WritingFeedback(
    decimal OverallBand,
    string Summary,
    List<WritingCriterion> Criteria,          // exactly 4: TaskAchievement/TaskResponse, CoherenceCohesion, LexicalResource, GrammaticalRangeAccuracy
    List<WritingError> Errors,
    List<VocabularyUpgrade> VocabularyUpgrades,
    string ImprovedExcerpt);
```

- `WritingFeedback.GeminiSchema` — a `const string` containing the Gemini responseSchema (type OBJECT mirroring the record above: numbers for bands, arrays of objects, all fields required). `WritingFeedback.SystemPrompt` — a `const string`: "You are a certified IELTS examiner… assess against the four official criteria (name them)… quote directly from the essay for every example and error… bands in 0.5 steps… be specific and actionable". Prompt and schema are designed together (spec §8): every field the schema demands, the prompt explains how to fill well.
- Service:

```csharp
public interface IWritingService
{
    Task<WritingEvaluationDto> EvaluateAsync(Guid userId, string role, WritingEvaluateRequest request);
    Task<List<WritingHistoryItemDto>> GetHistoryAsync(Guid userId);
    Task<WritingEvaluationDetailDto> GetDetailAsync(Guid userId, Guid id); // throws NotFoundException
}
public record WritingEvaluateRequest(Guid WritingPromptId, string EssayText);
public record WritingEvaluationDto(Guid WritingEvaluationId, decimal OverallBand, WritingFeedback Feedback);
public record WritingHistoryItemDto(Guid WritingEvaluationId, string TaskType, string Topic, decimal OverallBand, int WordCount, DateTime CreatedAt);
public record WritingEvaluationDetailDto(Guid WritingEvaluationId, string TaskType, string Topic, string QuestionText,
    string EssayText, int WordCount, decimal OverallBand, WritingFeedback Feedback, DateTime CreatedAt);
```

- [ ] **Step 1: Write the failing tests**

`WritingServiceTests.cs` — reuse the `FakeGeminiApiClient` pattern but for `IGeminiStructuredClient`: a `FakeStructuredClient` implementing `GenerateAsync<T>` returning a canned `WritingFeedback` (build it in code, serialize/deserialize through `T`), counting calls. Port the four guard scenarios from `EssayEvaluationGuardTests` to the new service (under-quota succeeds; at-quota → `QuotaExceededException` and 0 calls; premium bypass; >10,000 chars → `ValidationException` and 0 calls) plus:
- `Evaluate_PersistsJsonbFeedback_AndReturnsTyped` — after success, the `WritingEvaluations` row exists with `Feedback` containing `"overallBand"` and `WordCount > 0`.
- `GetDetail_NotOwner_ThrowsNotFound` (ownership).
- `Evaluate_UnknownPrompt_ThrowsNotFound`.
- `Evaluate_EmptyEssay_ThrowsValidation`.

Quota counting uses the **new** `WritingEvaluations` table (`user_id`, `CreatedAt >= today UTC`), same semantics as before.

- [ ] **Step 2: RED run** — `dotnet test --filter WritingServiceTests` → FAIL.

- [ ] **Step 3: Implement `WritingFeedback.cs`** (records + `GeminiSchema` const + `SystemPrompt` const as specified in Interfaces). The schema is ~60 lines of Gemini schema JSON; write it fully, mirroring the records field-for-field with `"required"` on every property, and `criteria` constrained with `"minItems": 4, "maxItems": 4` equivalents (`minItems`/`maxItems` keys in Gemini schema).

- [ ] **Step 4: Implement `WritingService`**

Order inside `EvaluateAsync` (mirrors the shipped v1 guards, now with exceptions):
1. `ValidationException` if essay null/whitespace or promptId empty; if `essayText.Length > 10_000` → `ValidationException("Essay exceeds the maximum length of 10,000 characters.")`.
2. Load prompt (`IsActive` not required for evaluation) → `NotFoundException("Writing prompt not found.")`.
3. Quota (skip if `role` is Premium/Admin, case-insensitive): count today's `WritingEvaluations` for user; at/over `DailyWritingQuota` (default 10) → `QuotaExceededException("Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.")`.
   `// ponytail: COUNT-then-proceed is racy under concurrency; acceptable at this scale — move to a per-user lock or unique-per-day constraint if abuse appears.`
4. Build user content: task type, question text, image description (Task 1), the essay. Call `_gemini.GenerateAsync<WritingFeedback>(WritingFeedbackPrompts.SystemPrompt, userContent, WritingFeedbackPrompts.GeminiSchema)`.
5. Persist `WritingEvaluation` (`Feedback = JsonSerializer.Serialize(feedback, CamelCase)`, `WordCount` = whitespace-split count, `OverallBand = feedback.OverallBand`, model + token counts from the result). Return `WritingEvaluationDto`.

`GetHistoryAsync`: project rows (join prompt) ordered desc. `GetDetailAsync`: filter `WritingEvaluationId == id && UserId == userId` → else `NotFoundException("Evaluation not found.")`; deserialize `Feedback` back to `WritingFeedback`.

- [ ] **Step 5: Implement `WritingV2.cs` functions** — thin: read `context.GetUserId()!.Value` + `GetUserRole()`, deserialize body with `JsonSerializerDefaults.Web`, call service, return `new OkObjectResult(dto)`. No try/catch — the exception middleware owns errors. Register `services.AddScoped<IWritingService, WritingService>();`.

- [ ] **Step 6: GREEN run** — `dotnet test backend/IELTS.AI.Evaluator.sln` → all pass.

- [ ] **Step 7: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: writing evaluation with structured deep feedback (schema-designed prompt)"
```

---

### Task 6: Speaking v2 — one-shot port onto speaking_sessions

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Functions/DTOs/SpeakingFeedback.cs`
- Create: `backend/IELTS.AI.Evaluator.Functions/Services/SpeakingService.cs`
- Create: `backend/IELTS.AI.Evaluator.Functions/Functions/SpeakingV2.cs`
- Test: `backend/IELTS.AI.Evaluator.Tests/SpeakingServiceTests.cs`

**Interfaces:**
- Endpoints: `POST /api/v2/speaking/sessions` body `{ speakingPromptId, part, turns: [{role, text}] }` → 200 `SpeakingSessionDto`; `GET /api/v2/speaking/sessions` → history; `GET /api/v2/speaking/sessions/{id}` → detail (404 not-owner). (Examiner-turn and PA arrive in Phase 4; today the frontend submits a single candidate turn.)
- Feedback shape:

```csharp
public record SpeakingCriterion(string Name, decimal Band, string Justification,
    List<string> Examples, List<string> Improvements);
public record SpeakingFeedback(
    decimal OverallBand,
    string Summary,
    List<SpeakingCriterion> Criteria); // exactly 3 from Gemini: FluencyCoherence, LexicalResource, GrammaticalRangeAccuracy
public record SpeakingTurn(string Role, string Text); // role: "examiner" | "candidate"
```

Pronunciation is Azure PA's job (Phase 4); `SpeakingSession.Pronunciation` stays null and `OverallBand` = average of the three Gemini bands rounded to nearest 0.5 until then. Detail DTO includes `pronunciation: null` so the frontend contract is stable.
- `SpeakingFeedback.GeminiSchema` + `SystemPrompt` consts, same design discipline as Task 5 (examiner persona, quote from transcript, 0.5 bands).

- [ ] **Step 1: Failing tests** — mirror `WritingServiceTests`: transcript cap 20,000 chars over ALL candidate turns combined (`ValidationException("Transcript exceeds the maximum length of 20,000 characters.")`), quota via `SpeakingSessions` count + `DailySpeakingQuota` (`QuotaExceededException("Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.")`), premium bypass, empty/no-candidate-turns → `ValidationException`, persists jsonb turns+feedback, `GetDetail` ownership, and `OverallBand` rounding check (bands 6.0/6.5/7.0 → overall 6.5).

- [ ] **Step 2: RED run.**

- [ ] **Step 3–5: Implement** DTOs/schema/prompt, `SpeakingService` (same guard order as writing; user content = part, question text, cue points, and the turns rendered as `Examiner: …` / `Candidate: …` lines), `SpeakingV2.cs` functions, DI registration.

Band rounding helper (unit-tested via the service test): `Math.Round(avg * 2, MidpointRounding.AwayFromZero) / 2`.

- [ ] **Step 6: GREEN run** — full suite passes.

- [ ] **Step 7: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: speaking sessions with structured feedback on speaking_sessions table"
```

---

### Task 7: Prompts, user profile, dashboard → v2 contract

**Files:**
- Rewrite: `backend/IELTS.AI.Evaluator.Functions/Functions/WritingPrompt.cs`, `SpeakingPrompt.cs`, `User.cs`, `Dashboard.cs`
- Modify: their services (`WritingPromptService.cs`, `SpeakingPromptService.cs`, `UserService.cs`, `DashboardService.cs`) to return plain DTOs / throw domain exceptions
- Test: `backend/IELTS.AI.Evaluator.Tests/PromptServiceTests.cs`

**Interfaces:**
- `GET /api/writing-prompts` (list, `?includeInactive=true` admin-only), `GET /api/writing-prompts/{id}`, `POST /api/writing-prompts` (admin, upsert; sets `IsActive`), and the same trio for `speaking-prompts`. Non-admin list returns only `IsActive` prompts.
- `GET /api/me` (profile from DB by `GetUserId()`), `PUT /api/me` (update `FullName`, `IELTSTargetScore`, `TargetTestDate` — never plan/role). Old `/api/user` admin list becomes `GET /api/admin/users` (admin-only).
- `GET /api/dashboard` reworked to read `WritingEvaluations` + `SpeakingSessions` (band trend, counts, recent items with a `type` discriminator `"writing" | "speaking"`).
- All functions: no try/catch, no envelope; admin checks via `context.IsAdmin()` → `throw new ForbiddenException("Administrator access required.")`.

- [ ] **Step 1: Failing tests** — `PromptServiceTests.cs`: upsert creates + updates; list excludes inactive for non-admin path (service takes `bool includeInactive`); unknown id on get → `NotFoundException`.

- [ ] **Step 2: RED run.**

- [ ] **Step 3: Rewrite services then functions** per Interfaces. Delete now-unused response-envelope DTO classes as you go (`WritingPromptResponseDto` etc.) — anything still referenced by old v1 evaluation functions stays until Task 8.

- [ ] **Step 4: GREEN run** — full suite.

- [ ] **Step 5: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.Tests
git commit -m "v2: prompts, profile, dashboard on plain HTTP contract"
```

---

### Task 8: Cutover — delete v1, fresh schema, User v2

**Files:**
- Delete: `Functions/EssayEvaluation.cs`, `Functions/SpeakingEvaluation.cs`, `Services/EssayEvaluationService.cs`, `Services/SpeakingEvaluationService.cs`, `Services/GeminiApiClient.cs`, old envelope DTO files, `backend/IELTS.AI.Evaluator.Tests/EssayEvaluationGuardTests.cs`, `SpeakingEvaluationGuardTests.cs`, `FakeGeminiApiClient.cs`
- Delete: `backend/IELTS.AI.Evaluator.Data/Models/EssayEvaluation.cs`, `SpeakingEvaluation.cs`
- Delete: `backend/IELTS.AI.Evaluator.Data/Migrations/*` (all)
- Modify: `User.cs` (drop `AuthProvider`, `WritingQuotaUsed`, `SpeakingQuotaUsed`, `IELTSTargetType`, `Essays`, `SpeakingEvaluations` collections), `EvaluatorDbContext.cs` (remove old DbSets/config), `Program.cs` (remove old service registrations)
- Create: fresh `InitialCreate` migration

**Interfaces:** consumes everything Tasks 1–7 produced; after this task only v2 surface exists.

- [ ] **Step 1: Delete the v1 files listed above** and fix compile errors (Program.cs registrations, using statements, any straggler references — the compiler is the checklist).

- [ ] **Step 2: Simplify `User`** to: `UserId`, `FirebaseUid`, `Email`, `FullName`, `Plan`, `IELTSTargetScore` (decimal), `TargetTestDate` (DateTimeOffset), `LastLogin` (DateTimeOffset), + BaseEntity timestamps. Update `EvaluatorDbContext` (remove `EssayEvaluations`/`SpeakingEvaluations` DbSets and their model config; keep unique index on `FirebaseUid`: `modelBuilder.Entity<User>().HasIndex(u => u.FirebaseUid).IsUnique();`).

- [ ] **Step 3: Regenerate the schema**

```bash
rm -rf backend/IELTS.AI.Evaluator.Data/Migrations
cd backend && dotnet ef migrations add InitialCreate --project IELTS.AI.Evaluator.Data --startup-project IELTS.AI.Evaluator.Data && cd ..
```

(`EvaluatorDbContextFactory` exists for design-time.) Then reset the local DB:

```bash
cd backend && dotnet ef database drop --force --project IELTS.AI.Evaluator.Data --startup-project IELTS.AI.Evaluator.Data && dotnet ef database update --project IELTS.AI.Evaluator.Data --startup-project IELTS.AI.Evaluator.Data && cd ..
```

- [ ] **Step 4: Full suite + build** — `dotnet build` + `dotnet test` green (old test files deleted; v2 tests all pass).

- [ ] **Step 5: Commit**

```bash
git add -A backend
git commit -m "v2 cutover: remove v1 evaluation stack, fresh InitialCreate schema, User v2"
```

---

### Task 9: Manual verification

**Files:** none.

- [ ] **Step 1:** `func start` in `backend/IELTS.AI.Evaluator.Functions`. Confirm the v2 function list (AuthSync, WritingV2 trio, SpeakingV2 trio, prompts, me, dashboard) and that v1 routes are gone.
- [ ] **Step 2:** `curl -i -X POST http://localhost:7071/api/auth/sync` without a token → 401 `{"message":"Missing bearer token"}`. `curl -i http://localhost:7071/api/v2/writing/evaluations` without a token → 401.
- [ ] **Step 3:** CORS preflight from `http://localhost:5173` still returns the allow header (regression check).
- [ ] **Step 4:** With a real Firebase token (grab one from the frontend session or Firebase REST): `POST /api/auth/sync` → 200 profile; then a v2 endpoint with the refreshed token → 200. (If no token is handy, note it for the user's smoke test — the frontend can't exercise this until Phase 2.)
