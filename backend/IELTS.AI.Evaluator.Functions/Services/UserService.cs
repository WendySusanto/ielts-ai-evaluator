using IELTS.AI.Evaluator.Data.Models;
using IELTS.AI.Evaluator.Functions.Exceptions;
using Microsoft.EntityFrameworkCore;

namespace IELTS.AI.Evaluator.Functions.Services;

/// <summary>Deliberately narrow: no Plan/Role field, so a caller can never smuggle a plan
/// change through the profile-update endpoint.</summary>
public record UpdateProfileRequest(string FullName, decimal IELTSTargetScore, DateTimeOffset TargetTestDate);

/// <summary>Same nullability contract as /api/auth/sync's AuthProfileDto: target score and
/// test date are null until the user sets them (stored as 0 / default in the DB).</summary>
public record UserProfileDto(Guid UserId, string Email, string FullName, string Plan,
    decimal? IeltsTargetScore, DateTimeOffset? TargetTestDate, DateTime CreatedAt);

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
        var user = await _db.Users
            .Where(u => u.UserId == userId && !u.IsDeleted)
            .FirstOrDefaultAsync()
            ?? throw new NotFoundException("User not found.");
        return ToDto(user);
    }

    public async Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == userId && !u.IsDeleted)
            ?? throw new NotFoundException("User not found.");

        user.FullName = request.FullName;
        user.IELTSTargetScore = request.IELTSTargetScore;
        user.TargetTestDate = request.TargetTestDate;

        await _db.SaveChangesAsync();

        return ToDto(user);
    }

    public async Task<List<UserProfileDto>> ListUsersAsync()
    {
        var users = await _db.Users
            .Where(u => !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();
        return users.Select(ToDto).ToList();
    }

    private static UserProfileDto ToDto(User u) => new(u.UserId, u.Email, u.FullName, u.Plan,
        u.IELTSTargetScore == 0 ? null : u.IELTSTargetScore,
        u.TargetTestDate == default ? null : u.TargetTestDate,
        u.CreatedAt);
}
