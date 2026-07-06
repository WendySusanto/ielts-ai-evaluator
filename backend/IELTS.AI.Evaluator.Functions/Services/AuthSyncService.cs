using IELTS.AI.Evaluator.Data.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace IELTS.AI.Evaluator.Functions.Services;

public record AuthProfileDto(Guid UserId, string Email, string FullName, string Plan,
    decimal? IeltsTargetScore, DateTimeOffset? TargetTestDate, bool ClaimsRefreshRequired);

public interface IAuthSyncService
{
    /// <summary>Get-or-create the user for this Firebase identity, update last_login,
    /// and report whether custom claims must be (re)set. DB-free callers use claims only.</summary>
    Task<(AuthProfileDto Profile, bool SetClaims, Guid UserId, string Role)> SyncAsync(
        string firebaseUid, string? email, string? fullName, IReadOnlyDictionary<string, object> existingClaims);
}

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
