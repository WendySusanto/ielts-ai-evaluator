using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace IELTS.AI.Evaluator.Data.Models
{
    /// <summary>Design-time factory for the `dotnet ef` CLI only; at runtime the DbContext comes from DI.
    /// Reads the DbConnectionString env var, else a local default.</summary>
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
