using System;
using System.Text.Json;
using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Functions
{
    public class User
    {
        private readonly ILogger<User> _logger;
        private readonly IUserService _userService;

        public User(
            ILogger<User> logger,
            IUserService userService)
        {
            _logger = logger;
            _userService = userService;
        }

        [Function("UpsertUser")]
        public async Task<IActionResult> UpsertUserAsync(
            [HttpTrigger(AuthorizationLevel.Function, "post", Route = "user")] HttpRequest req)
        {
            try
            {
                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<UserUpsertRequestDto>(requestBody);
                var result = await _userService.UpsertUserAsync(payload);

                if (!result.Success)
                {
                    if (result.Message == "Invalid request payload." || 
                        result.Message == "User not found." ||
                        result.Message == "Email already exists.")
                        return new BadRequestObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in UpsertUser function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetUser")]
        public async Task<IActionResult> GetUserAsync(
            [HttpTrigger(AuthorizationLevel.Function, "get", Route = "user")] HttpRequest req)
        {
            try
            {
                var idParam = req.Query["id"].ToString();
                
                if (string.IsNullOrEmpty(idParam))
                {
                    // If no ID is provided, return all users
                    var listResult = await _userService.GetUsersAsync();
                    if (!listResult.Success)
                    {
                        return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                    }
                    return new OkObjectResult(listResult);
                }

                // If ID is provided, return specific user
                if (!Guid.TryParse(idParam, out Guid userId))
                {
                    return new BadRequestObjectResult(new UserResponseDto
                    {
                        Success = false,
                        Message = "Invalid user ID format."
                    });
                }

                var result = await _userService.GetUserAsync(userId);
                if (!result.Success)
                {
                    if (result.Message == "User not found.")
                        return new NotFoundObjectResult(result);
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }

                return new OkObjectResult(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUser function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}