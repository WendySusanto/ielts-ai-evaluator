using IELTS.AI.Evaluator.Functions.DTOs;
using IELTS.AI.Evaluator.Functions.Services;
using IELTS.AI.Evaluator.Functions.Extensions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;

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
            [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "user")] HttpRequest req, FunctionContext context)
        {
            try
            {
                var userIdContext = context.GetUserId();

                var requestBody = await new StreamReader(req.Body).ReadToEndAsync();
                var payload = JsonSerializer.Deserialize<UserUpsertRequestDto>(requestBody);


                if (userIdContext != payload?.UserId)
                {
                    return new StatusCodeResult(StatusCodes.Status401Unauthorized);
                }

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
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "user")] HttpRequest req, FunctionContext context)
        {
            try
            {

                var isAdmin = context.IsAdmin();
                
                if (!isAdmin)
                {
                    return new StatusCodeResult(StatusCodes.Status401Unauthorized);
                }

                // If no ID is provided, return all users
                var listResult = await _userService.GetUsersAsync();
                if (!listResult.Success)
                {
                    return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                }
                return new OkObjectResult(listResult);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUser function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }

        [Function("GetUserProfile")]
        public async Task<IActionResult> Run([HttpTrigger(AuthorizationLevel.Anonymous, "get")] HttpRequestData req, FunctionContext context)
        {
            try
            {
                if (!string.IsNullOrEmpty(context.GetUserId().ToString()))
                {
                    var user = await _userService.GetUserAsync(context.GetUserId());

                    if (user == null)
                    {
                        return new UnauthorizedObjectResult("No user found");
                    }
          
                    user.Data.ClaimsUpdated = context.WereClaimsUpdated();
                    
                    if (!user.Success)
                    {
                        return new StatusCodeResult(StatusCodes.Status500InternalServerError);
                    }
                    return new OkObjectResult(user);
                } else
                {
                    return new UnauthorizedObjectResult("Id not available in the context");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetUserProfile function.");
                return new StatusCodeResult(StatusCodes.Status500InternalServerError);
            }
        }
    }
}