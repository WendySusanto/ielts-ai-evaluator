using Microsoft.Azure.Functions.Worker;
using System.Security.Claims;

namespace IELTS.AI.Evaluator.Functions.Extensions
{
    public static class FunctionContextExtensions
    {
        public static ClaimsPrincipal? GetUser(this FunctionContext context)
        {
            return context.Items.TryGetValue("User", out var user) ? user as ClaimsPrincipal : null;
        }

        public static Guid? GetUserId(this FunctionContext context)
        {
            return context.Items.TryGetValue("UserId", out var userId) && userId is Guid id ? id : null;
        }

        public static string? GetFirebaseUid(this FunctionContext context)
        {
            return context.Items.TryGetValue("FirebaseUid", out var firebaseUid) ? firebaseUid?.ToString() : null;
        }

        public static string? GetFullName(this FunctionContext context)
        {
            return context.Items.TryGetValue("FullName", out var fullName) ? fullName?.ToString() : null;
        }

        public static string? GetUserEmail(this FunctionContext context)
        {
            return context.Items.TryGetValue("Email", out var email) ? email?.ToString() : null;
        }

        public static string? GetAuthProvider(this FunctionContext context)
        {
            return context.Items.TryGetValue("AuthProvider", out var authProvider) ? authProvider?.ToString() : null;
        }

        public static string? GetUserPlan(this FunctionContext context)
        {
            return context.Items.TryGetValue("UserPlan", out var plan) ? plan?.ToString() : null;
        }

        public static int GetWritingQuotaUsed(this FunctionContext context)
        {
            return context.Items.TryGetValue("WritingQuotaUsed", out var quota) && quota is int q ? q : 0;
        }

        public static int GetSpeakingQuotaUsed(this FunctionContext context)
        {
            return context.Items.TryGetValue("SpeakingQuotaUsed", out var quota) && quota is int q ? q : 0;
        }

        public static string? GetIELTSTargetType(this FunctionContext context)
        {
            return context.Items.TryGetValue("IELTSTargetType", out var targetType) ? targetType?.ToString() : null;
        }

        public static decimal GetIELTSTargetScore(this FunctionContext context)
        {
            return context.Items.TryGetValue("IELTSTargetScore", out var score) && score is decimal s ? s : 0m;
        }

        public static DateTimeOffset? GetTargetTestDate(this FunctionContext context)
        {
            return context.Items.TryGetValue("TargetTestDate", out var date) && date is DateTimeOffset d ? d : null;
        }

        public static DateTimeOffset? GetLastLogin(this FunctionContext context)
        {
            return context.Items.TryGetValue("LastLogin", out var login) && login is DateTimeOffset l ? l : null;
        }

        public static DateTime? GetCreatedAt(this FunctionContext context)
        {
            return context.Items.TryGetValue("CreatedAt", out var created) && created is DateTime c ? c : null;
        }

        public static DateTime? GetUpdatedAt(this FunctionContext context)
        {
            return context.Items.TryGetValue("UpdatedAt", out var updated) && updated is DateTime u ? u : null;
        }

        public static bool WereClaimsUpdated(this FunctionContext context)
        {
            return context.Items.TryGetValue("ClaimsUpdated", out var updated) && updated is bool b && b;
        }

        public static string? GetUserRole(this FunctionContext context)
        {
            var user = context.GetUser();
            return user?.FindFirst(ClaimTypes.Role)?.Value;
        }

        public static bool IsAuthenticated(this FunctionContext context)
        {
            return context.GetUser()?.Identity?.IsAuthenticated == true;
        }

        public static bool IsAdmin(this FunctionContext context)
        {
            return context.GetUserRole()?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true;
        }

        public static bool IsPremiumUser(this FunctionContext context)
        {
            var role = context.GetUserRole();
            return role?.Equals("Premium", StringComparison.OrdinalIgnoreCase) == true ||
                   role?.Equals("Admin", StringComparison.OrdinalIgnoreCase) == true;
        }

        // Helper method to get all user data as an object for easy access
        public static object GetUserData(this FunctionContext context)
        {
            return new
            {
                UserId = context.GetUserId(),
                FirebaseUid = context.GetFirebaseUid(),
                FullName = context.GetFullName(),
                Email = context.GetUserEmail(),
                AuthProvider = context.GetAuthProvider(),
                Plan = context.GetUserPlan(),
                WritingQuotaUsed = context.GetWritingQuotaUsed(),
                SpeakingQuotaUsed = context.GetSpeakingQuotaUsed(),
                IELTSTargetType = context.GetIELTSTargetType(),
                IELTSTargetScore = context.GetIELTSTargetScore(),
                TargetTestDate = context.GetTargetTestDate(),
                LastLogin = context.GetLastLogin(),
                CreatedAt = context.GetCreatedAt(),
                UpdatedAt = context.GetUpdatedAt(),
                Role = context.GetUserRole(),
                IsAdmin = context.IsAdmin(),
                IsPremium = context.IsPremiumUser(),
                ClaimsUpdated = context.WereClaimsUpdated()
            };
        }
    }
}