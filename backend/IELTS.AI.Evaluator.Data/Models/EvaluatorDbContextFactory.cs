using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>
    /// Design-time factory used by the EF Core CLI tools (dotnet ef migrations ...).
    /// At runtime the DbContext is configured via dependency injection in the
    /// Functions host, so the connection string here only needs to be valid enough
    /// for the provider to scaffold migrations. It reads from the DbConnectionString
    /// environment variable when present, otherwise falls back to a local default.
    /// </summary>
    public class EvaluatorDbContextFactory : IDesignTimeDbContextFactory<EvaluatorDbContext>
    {
        public EvaluatorDbContext CreateDbContext(string[] args)
        {
            var connectionString =
                Environment.GetEnvironmentVariable("DbConnectionString")
                ?? "Host=localhost;Port=5501;Database=ielts;Username=postgres;Password=postgres";

            var optionsBuilder = new DbContextOptionsBuilder<EvaluatorDbContext>();
            optionsBuilder.UseNpgsql(connectionString);

            return new EvaluatorDbContext(optionsBuilder.Options);
        }
    }
}
