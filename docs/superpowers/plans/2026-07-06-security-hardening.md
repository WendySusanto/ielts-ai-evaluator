# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the security gaps in the Azure Functions backend: remove the config-leaking debug endpoint, lock CORS to an allowlist, enforce admin role on prompt management, stop trusting client-supplied user IDs (IDOR), cap input sizes, and add a Postgres-backed daily quota on Gemini evaluation calls.

**Architecture:** .NET 8 isolated Azure Functions (`backend/IELTS.AI.Evaluator.Functions`) + EF Core/Npgsql data project (`backend/IELTS.AI.Evaluator.Data`). Auth is a custom Firebase middleware that populates `FunctionContext.Items`; helpers live in `Extensions/FunctionContextExtensions.cs` (`GetUserId()`, `IsAdmin()`). Services return `{Success, Message}` DTOs and Functions map specific `Message` strings to HTTP status codes — new rejections follow that existing pattern.

**Tech Stack:** C# / .NET 8, EF Core, xUnit + EF InMemory for tests.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-06-security-hardening-design.md`
- Quota: Free plan 10 writing + 10 speaking evaluations per UTC day; settings keys `DailyWritingQuota`, `DailySpeakingQuota`; Premium/Admin unlimited; over-quota → HTTP 429.
- Input caps: essay 10,000 chars; speaking transcript 20,000 chars; over-limit → HTTP 400.
- CORS origins from settings key `AllowedOrigins` (comma-separated), dev default `http://localhost:5173`.
- No secrets in tracked files. No stack traces or config values in response bodies.
- Frontend request-shape cleanup (it still sends a now-ignored `userId`) is deferred to the refactor sub-project.
- Build check: `dotnet build backend/IELTS.AI.Evaluator.sln` must pass after every task.

---

### Task 1: Delete the config-leaking debug endpoint

**Files:**
- Delete: `backend/IELTS.AI.Evaluator.Functions/Functions/DiagnoseConfig.cs`

**Interfaces:** none — nothing references this class.

- [ ] **Step 1: Delete the file**

```bash
rm backend/IELTS.AI.Evaluator.Functions/Functions/DiagnoseConfig.cs
```

- [ ] **Step 2: Verify build**

Run: `dotnet build backend/IELTS.AI.Evaluator.sln`
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add -A backend/IELTS.AI.Evaluator.Functions/Functions
git commit -m "security: remove DiagnoseConfig endpoint that echoed the DB connection string"
```

---

### Task 2: CORS allowlist

**Files:**
- Modify: `backend/IELTS.AI.Evaluator.Functions/Program.cs:23-38`
- Modify (untracked, local only): `backend/IELTS.AI.Evaluator.Functions/local.settings.json` — add `"AllowedOrigins": "http://localhost:5173"` to `Values`.

**Interfaces:**
- Consumes: `AllowedOrigins` config value (comma-separated origins).
- Produces: default CORS policy used automatically by the Functions ASP.NET Core integration.

- [ ] **Step 1: Replace the CORS block in Program.cs**

Replace the `services.AddCors` block (currently `AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod().AllowCredentials()` — an invalid combination browsers reject) with:

```csharp
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
```

Note: `AllowCredentials()` is dropped deliberately — the frontend authenticates with a Bearer header, not cookies.

- [ ] **Step 2: Add the dev value to local.settings.json**

In `backend/IELTS.AI.Evaluator.Functions/local.settings.json`, inside `"Values"`, add:

```json
"AllowedOrigins": "http://localhost:5173"
```

(This file is gitignored; do not commit it. The `Host.CORS` key already present also stays — it serves the local Functions host.)

- [ ] **Step 3: Verify build**

Run: `dotnet build backend/IELTS.AI.Evaluator.sln`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions/Program.cs
git commit -m "security: replace wildcard CORS with config-driven origin allowlist"
```

---

### Task 3: Admin role check on prompt management

**Files:**
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/WritingPrompt.cs:28-35`
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/SpeakingPrompt.cs:25-33`

**Interfaces:**
- Consumes: `context.IsAdmin()` from `IELTS.AI.Evaluator.Functions.Extensions.FunctionContextExtensions`.

- [ ] **Step 1: Guard UpsertWritingPrompt**

In `WritingPrompt.cs`, add `using IELTS.AI.Evaluator.Functions.Extensions;` to the usings, add a `FunctionContext context` parameter to `UpsertWritingPromptAsync`, and add the guard as the first statement inside the `try`:

```csharp
[Function("UpsertWritingPrompt")]
public async Task<IActionResult> UpsertWritingPromptAsync(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing-prompt")] HttpRequest req,
    FunctionContext context)
{
    try
    {
        if (!context.IsAdmin())
        {
            return new ObjectResult(new { success = false, message = "Administrator access required." })
            { StatusCode = StatusCodes.Status403Forbidden };
        }

        var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
        // ... rest of the existing body unchanged
```

- [ ] **Step 2: Guard UpsertSpeakingPrompt**

Same change in `SpeakingPrompt.cs` — add the usings + `FunctionContext context` parameter to `UpsertSpeakingPromptAsync` and the identical guard as the first statement inside the `try`:

```csharp
[Function("UpsertSpeakingPrompt")]
public async Task<IActionResult> UpsertSpeakingPromptAsync(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "speaking-prompt")] HttpRequest req,
    FunctionContext context)
{
    try
    {
        if (!context.IsAdmin())
        {
            return new ObjectResult(new { success = false, message = "Administrator access required." })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
        // ... rest unchanged
```

- [ ] **Step 3: Verify build**

Run: `dotnet build backend/IELTS.AI.Evaluator.sln`
Expected: Build succeeded.

- [ ] **Step 4: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions/Functions/WritingPrompt.cs backend/IELTS.AI.Evaluator.Functions/Functions/SpeakingPrompt.cs
git commit -m "security: require admin role for prompt upsert endpoints"
```

---

### Task 4: Stop trusting client-supplied user IDs (IDOR)

**Files:**
- Modify: `backend/IELTS.AI.Evaluator.Functions/Services/EssayEvaluationService.cs` (interface + `EvaluateEssayAsync` + `GetEvaluationDetailAsync`)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Services/SpeakingEvaluationService.cs` (interface + `GetSpeakingDetailAsync`)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/EssayEvaluation.cs` (all three functions)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/SpeakingEvaluation.cs` (`GetSpeakingDetailAsync`)
- Modify: `backend/IELTS.AI.Evaluator.Functions/DTOs/EssayEvaluationDto.cs:18` (remove `UserId` property)

**Interfaces:**
- Consumes: `context.GetUserId()` (returns `Guid?`).
- Produces (later tasks depend on these exact signatures):
  - `Task<EssayEvaluationResponseDto> EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload)`
  - `Task<EvaluationDetailResponseDto> GetEvaluationDetailAsync(Guid userId, Guid essayEvaluationId)`
  - `Task<SpeakingDetailResponseDto> GetSpeakingDetailAsync(Guid userId, Guid speakingEvaluationId)`

- [ ] **Step 1: Change IEssayEvaluationService + implementations**

In `EssayEvaluationService.cs`:

```csharp
public interface IEssayEvaluationService
{
    Task<EssayEvaluationResponseDto> EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload);
    Task<EvaluationHistoryResponseDto> GetEvaluationHistoryAsync(Guid userId);
    Task<EvaluationDetailResponseDto> GetEvaluationDetailAsync(Guid userId, Guid essayEvaluationId);
}
```

- `EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload)`: replace the user lookup `u => u.UserId == payload.UserId` with `u => u.UserId == userId`.
- `GetEvaluationDetailAsync(Guid userId, Guid essayEvaluationId)`: add ownership to the query filter:

```csharp
.Where(e => e.EssayEvaluationId == essayEvaluationId && e.User.UserId == userId)
```

(Not-owner now returns the existing "Evaluation not found." — a 404, which doesn't reveal whether the ID exists.)

- [ ] **Step 2: Change ISpeakingEvaluationService + implementation**

In `SpeakingEvaluationService.cs`, change the interface line to
`Task<SpeakingDetailResponseDto> GetSpeakingDetailAsync(Guid userId, Guid speakingEvaluationId);`
and in the implementation add ownership to the query filter:

```csharp
.Where(e => e.SpeakingEvaluationId == speakingEvaluationId && e.User.UserId == userId)
```

- [ ] **Step 3: Update EssayEvaluation.cs functions to use the authenticated user**

All three functions get a `FunctionContext context` parameter and `using IELTS.AI.Evaluator.Functions.Extensions;`. Pattern (mirrors the existing `EvaluateSpeaking`):

```csharp
[Function("EvaluateEssay")]
public async Task<IActionResult> EvaluateEssayAsync(
    [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "writing/evaluate")] HttpRequest req,
    FunctionContext context)
{
    try
    {
        var userId = context.GetUserId();
        if (userId == null)
        {
            return new UnauthorizedObjectResult(new EssayEvaluationResponseDto
            { Success = false, Message = "User not authenticated" });
        }

        var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
        var payload = JsonSerializer.Deserialize<EssayEvaluationRequestDto>(requestBody);
        var result = await _essayEvaluationService.EvaluateEssayAsync(userId.Value, payload);
        // ... existing result mapping unchanged
```

- `GetEvaluationHistoryAsync`: delete the `req.Query["userId"]` parsing entirely; use `context.GetUserId()` with the same null-check, then `GetEvaluationHistoryAsync(userId.Value)`.
- `GetEvaluationDetailAsync`: keep the `id` query parsing, add the `context.GetUserId()` null-check, call `GetEvaluationDetailAsync(userId.Value, evalId)`.

- [ ] **Step 4: Update SpeakingEvaluation.cs GetSpeakingDetailAsync**

Add `FunctionContext context` parameter + null-checked `context.GetUserId()` (same pattern as its sibling functions in the same file), call `GetSpeakingDetailAsync(userId.Value, evalId)`.

- [ ] **Step 5: Remove `UserId` from EssayEvaluationRequestDto**

In `DTOs/EssayEvaluationDto.cs` delete the `public Guid UserId { get; set; }` line (line 18). The frontend still sends it; System.Text.Json ignores unknown JSON properties by default.

- [ ] **Step 6: Verify build**

Run: `dotnet build backend/IELTS.AI.Evaluator.sln`
Expected: Build succeeded, 0 errors (any missed call site will fail compilation here).

- [ ] **Step 7: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Functions
git commit -m "security: derive user identity from auth context, enforce evaluation ownership (IDOR)"
```

---

### Task 5: Input caps + daily quota on essay evaluation (with tests)

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Tests/IELTS.AI.Evaluator.Tests.csproj` (xUnit project)
- Create: `backend/IELTS.AI.Evaluator.Tests/FakeGeminiApiClient.cs`
- Create: `backend/IELTS.AI.Evaluator.Tests/EssayEvaluationGuardTests.cs`
- Modify: `backend/IELTS.AI.Evaluator.Functions/Services/EssayEvaluationService.cs` (`EvaluateEssayAsync`)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/EssayEvaluation.cs` (status mapping)

**Interfaces:**
- Consumes: `EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload)` from Task 4; `IGeminiApiClient` (`Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey)`, `Task<string> EvaluateSpeakingAsync(string transcript, string question, string? cuepoints, string? part, string apiKey)`).
- Produces: rejection messages (exact strings, used for HTTP mapping and reused in Task 6's pattern):
  - `"Essay exceeds the maximum length of 10,000 characters."` → 400
  - `"Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations."` → 429

- [ ] **Step 1: Create the test project**

```bash
cd backend
dotnet new xunit -o IELTS.AI.Evaluator.Tests
dotnet add IELTS.AI.Evaluator.Tests reference IELTS.AI.Evaluator.Functions
dotnet add IELTS.AI.Evaluator.Tests package Microsoft.EntityFrameworkCore.InMemory --version 8.0.11
dotnet sln IELTS.AI.Evaluator.sln add IELTS.AI.Evaluator.Tests
cd ..
```

- [ ] **Step 2: Write the fake Gemini client**

`backend/IELTS.AI.Evaluator.Tests/FakeGeminiApiClient.cs`:

```csharp
using IELTS.AI.Evaluator.Functions.Services;

namespace IELTS.AI.Evaluator.Tests;

/// <summary>Returns a minimal valid Gemini response so services can be tested without the network.</summary>
public class FakeGeminiApiClient : IGeminiApiClient
{
    public const string CannedResponse =
        """
        {"candidates":[{"content":{"parts":[{"text":"{\"overallBand\": 6.5}"}]}}],"modelVersion":"fake-model","usageMetadata":{"promptTokenCount":1,"candidatesTokenCount":1}}
        """;

    public int Calls { get; private set; }

    public Task<string> EvaluateEssayAsync(string userAnswer, string imageDescription, string question, string? taskType, string apiKey)
    {
        Calls++;
        return Task.FromResult(CannedResponse);
    }

    public Task<string> EvaluateSpeakingAsync(string transcript, string question, string? cuepoints, string? part, string apiKey)
    {
        Calls++;
        return Task.FromResult(CannedResponse);
    }
}
```

- [ ] **Step 3: Write the failing tests**

`backend/IELTS.AI.Evaluator.Tests/EssayEvaluationGuardTests.cs`:

```csharp
using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;

namespace IELTS.AI.Evaluator.Tests;

public class EssayEvaluationGuardTests
{
    private static EvaluatorDbContext NewDb() =>
        new(new DbContextOptionsBuilder<EvaluatorDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);

    private static IConfiguration Config() =>
        new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["GeminiApiKey"] = "test-key",
            ["DailyWritingQuota"] = "10",
        }).Build();

    private static (EssayEvaluationService svc, EvaluatorDbContext db, FakeGeminiApiClient gemini, User user, WritingPrompt prompt)
        Setup(string plan = "Free", int evaluationsToday = 0)
    {
        var db = NewDb();
        var user = new User { UserId = Guid.NewGuid(), FirebaseUid = "fake-uid", Email = "t@t.t", FullName = "T", AuthProvider = "Firebase", Plan = plan };
        var prompt = new WritingPrompt { WritingPromptId = Guid.NewGuid(), TaskType = "Task 2", Topic = "T", Question = "Q" };
        db.Users.Add(user);
        db.WritingPrompts.Add(prompt);
        for (var i = 0; i < evaluationsToday; i++)
        {
            db.EssayEvaluations.Add(new EssayEvaluation
            {
                EssayEvaluationId = Guid.NewGuid(),
                RawJson = "{}",
                UserAnswer = "a",
                User = user,
                WritingPrompt = prompt,
                AiModel = "m",
                CreatedAt = DateTime.UtcNow,
            });
        }
        db.SaveChanges();
        var gemini = new FakeGeminiApiClient();
        var svc = new EssayEvaluationService(gemini, db, NullLogger<EssayEvaluationService>.Instance, Config());
        return (svc, db, gemini, user, prompt);
    }

    private static EssayEvaluationRequestDto Request(WritingPrompt prompt, string answer = "A reasonable essay answer.") =>
        new() { WritingPromptId = prompt.WritingPromptId, UserAnswer = answer, Question = prompt.Question, TaskType = prompt.TaskType, ImageDescription = "" };

    [Fact]
    public async Task FreeUser_UnderQuota_Succeeds()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 9);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
        Assert.Equal(1, gemini.Calls);
    }

    [Fact]
    public async Task FreeUser_AtQuota_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup(evaluationsToday: 10);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.False(result.Success);
        Assert.Equal("Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }

    [Fact]
    public async Task PremiumUser_AtQuota_Succeeds()
    {
        var (svc, _, _, user, prompt) = Setup(plan: "Premium", evaluationsToday: 10);
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt));
        Assert.True(result.Success);
    }

    [Fact]
    public async Task OversizedEssay_RejectedWithoutGeminiCall()
    {
        var (svc, _, gemini, user, prompt) = Setup();
        var result = await svc.EvaluateEssayAsync(user.UserId, Request(prompt, new string('a', 10_001)));
        Assert.False(result.Success);
        Assert.Equal("Essay exceeds the maximum length of 10,000 characters.", result.Message);
        Assert.Equal(0, gemini.Calls);
    }
}
```

Adjust the `User`/`WritingPrompt` initializers if required properties differ — set only what the models require to compile.

- [ ] **Step 4: Run tests to verify they fail**

Run: `dotnet test backend/IELTS.AI.Evaluator.sln --filter EssayEvaluationGuardTests`
Expected: FAIL — quota/length messages not produced yet (and `FreeUser_AtQuota` currently calls Gemini).

- [ ] **Step 5: Implement guards in EvaluateEssayAsync**

Rework `EvaluateEssayAsync` in `EssayEvaluationService.cs` (note the reorder: user + prompt now load **before** the Gemini call, so invalid users no longer burn a paid API call):

```csharp
private const int MaxEssayLength = 10_000;

public async Task<EssayEvaluationResponseDto> EvaluateEssayAsync(Guid userId, EssayEvaluationRequestDto payload)
{
    if (payload == null || string.IsNullOrWhiteSpace(payload.UserAnswer) || payload.WritingPromptId == Guid.Empty)
    {
        return new EssayEvaluationResponseDto { Success = false, Message = "Invalid request payload." };
    }

    if (payload.UserAnswer.Length > MaxEssayLength)
    {
        return new EssayEvaluationResponseDto { Success = false, Message = "Essay exceeds the maximum length of 10,000 characters." };
    }

    var geminiApiKey = _configuration["GeminiApiKey"];
    if (string.IsNullOrWhiteSpace(geminiApiKey))
    {
        _logger.LogError("Gemini API key is missing.");
        return new EssayEvaluationResponseDto { Success = false, Message = "Gemini API key is missing." };
    }

    try
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(u => u.UserId == userId);
        var writingPrompt = await _dbContext.WritingPrompts.FirstOrDefaultAsync(wp => wp.WritingPromptId == payload.WritingPromptId);
        if (user == null || writingPrompt == null)
        {
            return new EssayEvaluationResponseDto { Success = false, Message = "User or WritingPrompt not found." };
        }

        var isUnlimitedPlan = user.Plan?.ToLowerInvariant() is "premium" or "admin";
        if (!isUnlimitedPlan)
        {
            var dailyLimit = int.TryParse(_configuration["DailyWritingQuota"], out var l) ? l : 10;
            var todayUtc = DateTime.UtcNow.Date;
            var usedToday = await _dbContext.EssayEvaluations
                .CountAsync(e => e.User.UserId == userId && e.CreatedAt >= todayUtc);
            if (usedToday >= dailyLimit)
            {
                return new EssayEvaluationResponseDto
                {
                    Success = false,
                    Message = "Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations."
                };
            }
        }

        string aiResponseJson = await _geminiApiClient.EvaluateEssayAsync(payload.UserAnswer, payload.ImageDescription, payload.Question, payload.TaskType, geminiApiKey);
        // ... rest of the existing method body unchanged (parse response, save entity, return DTO)
```

Delete the now-duplicate `user`/`writingPrompt` lookup that previously sat after the Gemini call.

- [ ] **Step 6: Map new messages to HTTP codes in EssayEvaluation.cs**

In `EvaluateEssayAsync`'s result mapping, extend the failure handling:

```csharp
if (!result.Success)
{
    if (result.Message == "Daily writing evaluation quota reached. Upgrade to Premium for unlimited evaluations.")
        return new ObjectResult(result) { StatusCode = StatusCodes.Status429TooManyRequests };
    if (result.Message == "Invalid request payload." ||
        result.Message == "User or WritingPrompt not found." ||
        result.Message == "Invalid JSON format." ||
        result.Message == "Essay exceeds the maximum length of 10,000 characters.")
        return new BadRequestObjectResult(result);
    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `dotnet test backend/IELTS.AI.Evaluator.sln --filter EssayEvaluationGuardTests`
Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Tests backend/IELTS.AI.Evaluator.Functions backend/IELTS.AI.Evaluator.sln
git commit -m "security: daily quota + essay length cap on writing evaluation, with tests"
```

---

### Task 6: Input cap + daily quota on speaking evaluation (with tests)

**Files:**
- Create: `backend/IELTS.AI.Evaluator.Tests/SpeakingEvaluationGuardTests.cs`
- Modify: `backend/IELTS.AI.Evaluator.Functions/Services/SpeakingEvaluationService.cs` (`EvaluateSpeakingAsync`)
- Modify: `backend/IELTS.AI.Evaluator.Functions/Functions/SpeakingEvaluation.cs` (status mapping)

**Interfaces:**
- Consumes: `FakeGeminiApiClient` from Task 5; existing `EvaluateSpeakingAsync(Guid userId, SpeakingEvaluationRequestDto payload)`.
- Produces: rejection messages:
  - `"Transcript exceeds the maximum length of 20,000 characters."` → 400
  - `"Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations."` → 429

- [ ] **Step 1: Write the failing tests**

`backend/IELTS.AI.Evaluator.Tests/SpeakingEvaluationGuardTests.cs` — same structure as `EssayEvaluationGuardTests`, with `SpeakingEvaluationService`, `SpeakingPrompt` (set its required `Part`/`Topic`/`Question`-like properties per the model), `SpeakingEvaluation` seed rows (`Transcript = "a"` instead of `UserAnswer`), config key `DailySpeakingQuota = "10"`, and request DTO:

```csharp
private static SpeakingEvaluationRequestDto Request(SpeakingPrompt prompt, string transcript = "A spoken answer.") =>
    new() { SpeakingPromptId = prompt.SpeakingPromptId, Transcript = transcript, Question = "Q", Part = "Part 1", Cuepoints = "" };
```

Four tests, mirroring Task 5 exactly:
- `FreeUser_UnderQuota_Succeeds` (9 today → Success, 1 Gemini call)
- `FreeUser_AtQuota_RejectedWithoutGeminiCall` (10 today → `"Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations."`, 0 Gemini calls)
- `PremiumUser_AtQuota_Succeeds`
- `OversizedTranscript_RejectedWithoutGeminiCall` (20,001 chars → `"Transcript exceeds the maximum length of 20,000 characters."`, 0 Gemini calls)

Adjust DTO property names to the actual `SpeakingEvaluationRequestDto` definition if they differ.

- [ ] **Step 2: Run tests to verify they fail**

Run: `dotnet test backend/IELTS.AI.Evaluator.sln --filter SpeakingEvaluationGuardTests`
Expected: FAIL.

- [ ] **Step 3: Implement guards in EvaluateSpeakingAsync**

In `SpeakingEvaluationService.cs` (user + prompt already load before the Gemini call here — only the guards are new):

```csharp
private const int MaxTranscriptLength = 20_000;
```

After the existing payload null/empty validation, add:

```csharp
if (payload.Transcript.Length > MaxTranscriptLength)
{
    return new SpeakingEvaluationResponseDto { Success = false, Message = "Transcript exceeds the maximum length of 20,000 characters." };
}
```

After the existing `user == null || speakingPrompt == null` check, add:

```csharp
var isUnlimitedPlan = user.Plan?.ToLowerInvariant() is "premium" or "admin";
if (!isUnlimitedPlan)
{
    var dailyLimit = int.TryParse(_configuration["DailySpeakingQuota"], out var l) ? l : 10;
    var todayUtc = DateTime.UtcNow.Date;
    var usedToday = await _dbContext.SpeakingEvaluations
        .CountAsync(e => e.User.UserId == userId && e.CreatedAt >= todayUtc);
    if (usedToday >= dailyLimit)
    {
        return new SpeakingEvaluationResponseDto
        {
            Success = false,
            Message = "Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations."
        };
    }
}
```

- [ ] **Step 4: Map new messages to HTTP codes in SpeakingEvaluation.cs**

In `EvaluateSpeakingAsync`'s result mapping:

```csharp
if (!result.Success)
{
    if (result.Message == "Daily speaking evaluation quota reached. Upgrade to Premium for unlimited evaluations.")
        return new ObjectResult(result) { StatusCode = StatusCodes.Status429TooManyRequests };
    if (result.Message == "Invalid request payload." ||
        result.Message == "User or SpeakingPrompt not found." ||
        result.Message == "Invalid JSON format." ||
        result.Message == "Transcript exceeds the maximum length of 20,000 characters.")
        return new BadRequestObjectResult(result);
    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
}
```

- [ ] **Step 5: Run all tests**

Run: `dotnet test backend/IELTS.AI.Evaluator.sln`
Expected: all 8 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/IELTS.AI.Evaluator.Tests backend/IELTS.AI.Evaluator.Functions
git commit -m "security: daily quota + transcript length cap on speaking evaluation, with tests"
```

---

### Task 7: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Start the backend and exercise CORS**

Run the Functions host (`func start` in `backend/IELTS.AI.Evaluator.Functions` or via IDE). From a terminal:

```bash
curl -i -X OPTIONS http://localhost:7071/api/writing/evaluate -H "Origin: http://localhost:5173" -H "Access-Control-Request-Method: POST"
curl -i -X OPTIONS http://localhost:7071/api/writing/evaluate -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST"
```

Expected: first response includes `Access-Control-Allow-Origin: http://localhost:5173`; second response has no `Access-Control-Allow-Origin` header.

- [ ] **Step 2: Confirm DiagnoseConfig is gone**

```bash
curl -i http://localhost:7071/api/DiagnoseConfig
```

Expected: 404.

- [ ] **Step 3: Exercise the app**

Log in via the frontend, submit a writing evaluation, view history/detail — all still work. Confirm a non-admin user gets 403 from prompt upsert (e.g. via the Admin page or curl with a free user's token).
