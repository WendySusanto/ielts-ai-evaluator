using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace IELTS.AI.Evaluator.Data.Models
{
    public class EvaluatorDbContext : DbContext
    {
        public EvaluatorDbContext(DbContextOptions<EvaluatorDbContext> options) : base(options) { }

        public DbSet<User> Users => Set<User>();
        public DbSet<Essay> Essays => Set<Essay>();
        public DbSet<EssayEvaluation> EssayEvaluations => Set<EssayEvaluation>();
        //public DbSet<SpeakingAnswer> SpeakingAnswers => Set<SpeakingAnswer>();
        public DbSet<WritingPrompt> WritingPrompts => Set<WritingPrompt>();
        //public DbSet<SpeakingPrompt> SpeakingPrompts => Set<SpeakingPrompt>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            foreach (var entity in modelBuilder.Model.GetEntityTypes())
            {
                if (typeof(BaseEntity).IsAssignableFrom(entity.ClrType))
                {
                    modelBuilder.Entity(entity.ClrType).Property("CreatedAt").HasDefaultValueSql("NOW()");
                    modelBuilder.Entity(entity.ClrType).Property("UpdatedAt").HasDefaultValueSql("NOW()");
                }
            }

            modelBuilder.Entity<Essay>()
                .HasOne(e => e.Evaluation)
                .WithOne(ev => ev.Essay)
                .HasForeignKey<EssayEvaluation>(ev => ev.EssayId);

            base.OnModelCreating(modelBuilder);
        }

        public override int SaveChanges()
        {
            var entries = ChangeTracker.Entries<BaseEntity>();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Modified)
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            return base.SaveChanges();
        }

        public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            var entries = ChangeTracker.Entries<BaseEntity>();
            foreach (var entry in entries)
            {
                if (entry.State == EntityState.Modified)
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
            }

            return await base.SaveChangesAsync(cancellationToken);
        }
    }

}
