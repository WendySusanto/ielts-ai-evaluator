using System.Text.Json;
using IELTS.AI.Evaluator.Functions.Exceptions;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 profile + admin user-list endpoints. Thin: no try/catch — the exception
/// middleware maps domain exceptions to their status codes.</summary>
public class User
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly IUserService _service;

    public User(IUserService service) => _service = service;

    [Function("Me_Get")]
    public async Task<IActionResult> GetMeAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "me")] HttpRequest req,
        FunctionContext context)
    {
        var profile = await _service.GetProfileAsync(context.GetUserId()!.Value);
        return new OkObjectResult(profile);
    }

    [Function("Me_Update")]
    public async Task<IActionResult> UpdateMeAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "me")] HttpRequest req,
        FunctionContext context)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<UpdateProfileRequest>(body, Web)!;
        var profile = await _service.UpdateProfileAsync(context.GetUserId()!.Value, request);
        return new OkObjectResult(profile);
    }

    [Function("Admin_ListUsers")]
    public async Task<IActionResult> ListUsersAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "manage/users")] HttpRequest req,
        FunctionContext context)
    {
        if (!context.IsAdmin())
            throw new ForbiddenException("Administrator access required.");

        var users = await _service.ListUsersAsync();
        return new OkObjectResult(users);
    }

    [Function("Admin_DeleteUser")]
    public async Task<IActionResult> DeleteUserAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "manage/users/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        if (!context.IsAdmin())
            throw new ForbiddenException("Administrator access required.");

        await _service.DeleteUserAsync(context.GetUserId()!.Value, id);
        return new NoContentResult();
    }
}
