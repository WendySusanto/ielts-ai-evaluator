using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.DTOs;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services
{
    public interface IUserService
    {
        Task<UserResponseDto> UpsertUserAsync(UserUpsertRequestDto payload);
        Task<UserResponseDto> GetUserAsync(Guid userId);
        Task<UserListResponseDto> GetUsersAsync();
    }

    public class UserService : IUserService
    {
        private readonly EvaluatorDbContext _dbContext;
        private readonly ILogger<UserService> _logger;

        public UserService(
            EvaluatorDbContext dbContext,
            ILogger<UserService> logger)
        {
            _dbContext = dbContext;
            _logger = logger;
        }

        public async Task<UserResponseDto> UpsertUserAsync(UserUpsertRequestDto payload)
        {
            try
            {
                if (payload == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Invalid request payload."
                    };
                }

                var existingUser = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.Email == payload.Email && u.UserId != payload.UserId);
                if (existingUser != null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "Email already exists."
                    };
                }

                User user;
                if (payload.UserId.HasValue)
                {
                    user = await _dbContext.Users
                        .FirstOrDefaultAsync(u => u.UserId == payload.UserId.Value);

                    if (user == null)
                    {
                        return new UserResponseDto
                        {
                            Success = false,
                            Message = "User not found."
                        };
                    }
                }
                else
                {
                    user = new User
                    {
                        UserId = Guid.NewGuid(),
                        CreatedAt = DateTime.UtcNow
                    };
                    _dbContext.Users.Add(user);
                }

                // Update properties
                user.Email = payload.Email;
                user.AuthProvider = payload.AuthProvider;
                user.Plan = payload.Plan;
                user.WritingQuotaUsed = payload.WritingQuotaUsed;
                user.SpeakingQuotaUsed = payload.SpeakingQuotaUsed;
                user.IELTSTargetType = payload.IELTSTargetType;
                user.IELTSTargetScore = payload.IELTSTargetScore;
                user.TargetTestDate = payload.TargetTestDate.ToUniversalTime();
 

                await _dbContext.SaveChangesAsync();

                return new UserResponseDto
                {
                    Success = true,
                    Message = payload.UserId.HasValue ? "User updated successfully." : "User created successfully.",
                    Data = MapToDto(user)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing user upsert.");
                return new UserResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<UserResponseDto> GetUserAsync(Guid userId)
        {
            try
            {
                var user = await _dbContext.Users
                    .FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted);

                if (user == null)
                {
                    return new UserResponseDto
                    {
                        Success = false,
                        Message = "User not found."
                    };
                }

                return new UserResponseDto
                {
                    Success = true,
                    Message = "User retrieved successfully.",
                    Data = MapToDto(user)
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving user.");
                return new UserResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        public async Task<UserListResponseDto> GetUsersAsync()
        {
            try
            {
                var users = await _dbContext.Users
                    .Where(u => !u.IsDeleted)
                    .OrderByDescending(u => u.CreatedAt)
                    .Select(u => MapToDto(u))
                    .ToListAsync();

                return new UserListResponseDto
                {
                    Success = true,
                    Message = "Users retrieved successfully.",
                    Data = users
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving users.");
                return new UserListResponseDto
                {
                    Success = false,
                    Message = "Internal server error."
                };
            }
        }

        private static UserDto MapToDto(User user)
        {
            return new UserDto
            {
                UserId = user.UserId,
                Email = user.Email,
                AuthProvider = user.AuthProvider,
                Plan = user.Plan,
                WritingQuotaUsed = user.WritingQuotaUsed,
                SpeakingQuotaUsed = user.SpeakingQuotaUsed,
                IELTSTargetType = user.IELTSTargetType,
                IELTSTargetScore = user.IELTSTargetScore,
                TargetTestDate = user.TargetTestDate,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt,
                IsDeleted = user.IsDeleted
            };
        }
    }
}