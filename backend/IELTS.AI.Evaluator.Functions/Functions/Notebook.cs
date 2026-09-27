using System.Text.Json;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Extensions;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Functions;

/// <summary>v2 vocabulary notebook endpoints, always scoped to the caller. Thin: no try/catch —
/// the exception middleware maps domain exceptions to their status codes.</summary>
public class Notebook
{
    private static readonly JsonSerializerOptions Web = new(JsonSerializerDefaults.Web);

    private readonly INotebookService _service;

    public Notebook(INotebookService service) => _service = service;

    [Function("Notebook_List")]
    public async Task<IActionResult> ListAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "v2/notebook")] HttpRequest req,
        FunctionContext context)
    {
        var entries = await _service.ListAsync(context.GetUserId()!.Value);
        return new OkObjectResult(entries);
    }

    [Function("Notebook_Create")]
    public async Task<IActionResult> CreateAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "v2/notebook")] HttpRequest req,
        FunctionContext context)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<NotebookCreateRequest>(body, Web)!;
        var entry = await _service.CreateAsync(context.GetUserId()!.Value, request);
        return new OkObjectResult(entry);
    }

    [Function("Notebook_Suggest")]
    public async Task<IActionResult> SuggestAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "v2/notebook/suggest")] HttpRequest req,
        FunctionContext context)
    {
        // Cancelled with the invocation, so an abandoned lookup doesn't pay for a Gemini call.
        var ct = context.CancellationToken;
        var body = await new StreamReader(req.Body).ReadToEndAsync(ct);
        var request = JsonSerializer.Deserialize<WordSuggestionRequest>(body, Web)!;
        var suggestion = await _service.SuggestAsync(request.Word, ct);
        return new OkObjectResult(suggestion);
    }

    [Function("Notebook_Update")]
    public async Task<IActionResult> UpdateAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "put", Route = "v2/notebook/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        var body = await new StreamReader(req.Body).ReadToEndAsync();
        var request = JsonSerializer.Deserialize<NotebookUpdateRequest>(body, Web)!;
        var entry = await _service.UpdateAsync(context.GetUserId()!.Value, id, request);
        return new OkObjectResult(entry);
    }

    [Function("Notebook_Delete")]
    public async Task<IActionResult> DeleteAsync(
        [HttpTrigger(AuthorizationLevel.Anonymous, "delete", Route = "v2/notebook/{id:guid}")] HttpRequest req,
        FunctionContext context,
        Guid id)
    {
        await _service.DeleteAsync(context.GetUserId()!.Value, id);
        return new NoContentResult();
    }
}
