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
        public DbSet<EssayEvaluation> EssayEvaluations => Set<EssayEvaluation>();
        public DbSet<SpeakingEvaluation> SpeakingEvaluations => Set<SpeakingEvaluation>();
        public DbSet<WritingPrompt> WritingPrompts => Set<WritingPrompt>();
        public DbSet<SpeakingPrompt> SpeakingPrompts => Set<SpeakingPrompt>();

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

            modelBuilder.Entity<User>().HasKey(u => u.UserId);
            modelBuilder.Entity<EssayEvaluation>().HasKey(e => e.EssayEvaluationId);
            modelBuilder.Entity<WritingPrompt>().HasKey(p => p.WritingPromptId);
            modelBuilder.Entity<SpeakingEvaluation>().HasKey(e => e.SpeakingEvaluationId);
            modelBuilder.Entity<SpeakingPrompt>().HasKey(p => p.SpeakingPromptId);

            modelBuilder.Entity<EssayEvaluation>()
                .HasOne(e => e.User)
                .WithMany(u => u.Essays)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<EssayEvaluation>()
                .HasOne(e => e.WritingPrompt)
                .WithMany() // You can create a `ICollection<EssayEvaluation>` in `WritingPrompt` if needed
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SpeakingEvaluation>()
                .HasOne(e => e.User)
                .WithMany(u => u.SpeakingEvaluations)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<SpeakingEvaluation>()
                .HasOne(e => e.SpeakingPrompt)
                .WithMany()
                .OnDelete(DeleteBehavior.Cascade);


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
