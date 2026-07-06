using Microsoft.Azure.Functions.Worker;

namespace IELTS.AI.Evaluator.Functions.Extensions
{
    public static class FunctionContextExtensions
    {
        public static Guid? GetUserId(this FunctionContext context)
        {
            return context.Items.TryGetValue("UserId", out var userId) && userId is Guid id ? id : null;
        }

        public static string? GetUserRole(this FunctionContext context)
        {
            return context.Items.TryGetValue("Role", out var role) ? role?.ToString() : null;
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
    }
}
