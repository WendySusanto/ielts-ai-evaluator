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

/// <summary>The admin list's own shape rather than UserProfileDto + fields: the two usage
/// counters are abuse signals, and /api/me has no business computing or returning them.
/// GeminiTokensToday sums prompt + completion across all three paid paths (writing evaluations,
/// speaking evaluations, live examiner turns).</summary>
public record AdminUserDto(Guid UserId, string Email, string FullName, string Plan,
    decimal? IeltsTargetScore, DateTimeOffset? TargetTestDate, DateTime CreatedAt,
    int SpeechTokensToday, int GeminiTokensToday);

public interface IUserService
{
    Task<UserProfileDto> GetProfileAsync(Guid userId);
    Task<UserProfileDto> UpdateProfileAsync(Guid userId, UpdateProfileRequest request);
    Task<List<AdminUserDto>> ListUsersAsync();
    Task DeleteUserAsync(Guid actingAdminId, Guid targetUserId);
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

    public async Task<List<AdminUserDto>> ListUsersAsync()
    {
        var users = await _db.Users
            .Where(u => !u.IsDeleted)
            .OrderByDescending(u => u.CreatedAt)
            .ToListAsync();

        // Each counter is one grouped query joined in memory — per-user counts would be an N+1.
        // UTC day boundary, same convention as the daily evaluation quotas.
        // ponytail: four aggregates per page load, each over an indexed (UserId, CreatedAt).
        // Fine while the user list is one unpaginated page; revisit together, not before.
        var todayUtc = DateTime.UtcNow.Date;

        var speechToday = await _db.SpeechTokenIssues
            .Where(t => t.CreatedAt >= todayUtc)
            .GroupBy(t => t.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var geminiToday = await SumGeminiTokensAsync(todayUtc);

        return users.Select(u => new AdminUserDto(u.UserId, u.Email, u.FullName, u.Plan,
            u.IELTSTargetScore == 0 ? null : u.IELTSTargetScore,
            u.TargetTestDate == default ? null : u.TargetTestDate,
            u.CreatedAt,
            speechToday.GetValueOrDefault(u.UserId),
            geminiToday.GetValueOrDefault(u.UserId))).ToList();
    }

    /// <summary>Prompt + completion tokens per user since <paramref name="since"/>, summed across
    /// the three tables that bill Gemini. Kept as three queries rather than a union so each one
    /// stays a plain indexed aggregate.</summary>
    private async Task<Dictionary<Guid, int>> SumGeminiTokensAsync(DateTime since)
    {
        var totals = new Dictionary<Guid, int>();

        void Merge(IEnumerable<(Guid UserId, int Tokens)> rows)
        {
            foreach (var (userId, tokens) in rows)
                totals[userId] = totals.GetValueOrDefault(userId) + tokens;
        }

        Merge(await _db.WritingEvaluations
            .Where(e => e.CreatedAt >= since)
            .GroupBy(e => e.UserId)
            .Select(g => new ValueTuple<Guid, int>(g.Key, g.Sum(e => e.PromptTokens + e.CompletionTokens)))
            .ToListAsync());

        Merge(await _db.SpeakingSessions
            .Where(s => s.CreatedAt >= since)
            .GroupBy(s => s.UserId)
            .Select(g => new ValueTuple<Guid, int>(g.Key, g.Sum(s => s.PromptTokens + s.CompletionTokens)))
            .ToListAsync());

        Merge(await _db.ExaminerTurnUsages
            .Where(t => t.CreatedAt >= since)
            .GroupBy(t => t.UserId)
            .Select(g => new ValueTuple<Guid, int>(g.Key, g.Sum(t => t.PromptTokens + t.CompletionTokens)))
            .ToListAsync());

        return totals;
    }

    /// <summary>Soft delete: flips IsDeleted, which FirebaseAuthenticationMiddleware turns into a
    /// 403 once its 60-second account cache expires. The Firebase account itself is left alone —
    /// the user can still sign in, they just cannot reach any endpoint.</summary>
    public async Task DeleteUserAsync(Guid actingAdminId, Guid targetUserId)
    {
        // An admin deleting themselves would revoke their own access to this screen, and with it
        // the ability to undo it anywhere but the database.
        if (actingAdminId == targetUserId)
            throw new ValidationException("You cannot delete your own account.");

        var user = await _db.Users.FirstOrDefaultAsync(u => u.UserId == targetUserId && !u.IsDeleted)
            ?? throw new NotFoundException("User not found.");

        user.IsDeleted = true;
        await _db.SaveChangesAsync();
    }

    private static UserProfileDto ToDto(User u) => new(u.UserId, u.Email, u.FullName, u.Plan,
        u.IELTSTargetScore == 0 ? null : u.IELTSTargetScore,
        u.TargetTestDate == default ? null : u.TargetTestDate,
        u.CreatedAt);
}
