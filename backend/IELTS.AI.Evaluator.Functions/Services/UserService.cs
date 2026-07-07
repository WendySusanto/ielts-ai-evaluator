using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

/// <summary>Deliberately narrow: no Plan/Role field, so a caller can never smuggle a plan
/// change through the profile-update endpoint.</summary>
public record UpdateProfileRequest(string FullName, decimal IELTSTargetScore, DateTimeOffset TargetTestDate);

public record UserProfileDto(Guid UserId, string Email, string FullName, string Plan, string IELTSTargetType,
    decimal IELTSTargetScore, DateTimeOffset TargetTestDate, DateTime CreatedAt);

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<List<UserProfileDto>> ListUsersAsync();
}

public class UserService : IUserService
{
    private readonly EvaluatorDbContext _db;

    public UserService(EvaluatorDbContext db) => _db = db;

    public async Task<UserProfileDto> GetProfileAsync(Guid userId)
    {
        return await _db.Users
            .Where(u => u.UserId == userId && !u.IsDeleted)
            .Select(u => new UserProfileDto(u.UserId, u.Email, u.FullName, u.Plan, u.IELTSTargetType,
                u.IELTSTargetScore, u.TargetTestDate, u.CreatedAt))
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("User not found.");
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted)
            ?? throw new NotFoundException("User not found.");

        user.FullName = request.FullName;
        user.IELTSTargetScore = request.IELTSTargetScore;
        user.TargetTestDate = request.TargetTestDate;

        await _db.SaveChangesAsync();

        return new UserProfileDto(user.UserId, user.Email, user.FullName, user.Plan, user.IELTSTargetType,
            user.IELTSTargetScore, user.TargetTestDate, user.CreatedAt);
    }

    public async Task<List<UserProfileDto>> ListUsersAsync()
    {
        return await _db.Users
            .Where(u => !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAt)
            .Select(u => new UserProfileDto(u.UserId, u.Email, u.FullName, u.Plan, u.IELTSTargetType,
                u.IELTSTargetScore, u.TargetTestDate, u.CreatedAt))
            .ToListAsync();
    }
}
