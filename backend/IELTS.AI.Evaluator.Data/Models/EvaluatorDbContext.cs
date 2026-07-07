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
        public DbSet<WritingPrompt> WritingPrompts => Set<WritingPrompt>();
        public DbSet<SpeakingPrompt> SpeakingPrompts => Set<SpeakingPrompt>();
        public DbSet<WritingEvaluation> WritingEvaluations => Set<WritingEvaluation>();
        public DbSet<SpeakingSession> SpeakingSessions => Set<SpeakingSession>();

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
            modelBuilder.Entity<User>().HasIndex(u => u.FirebaseUid).IsUnique();
            modelBuilder.Entity<WritingPrompt>().HasKey(p => p.WritingPromptId);
            modelBuilder.Entity<SpeakingPrompt>().HasKey(p => p.SpeakingPromptId);

            modelBuilder.Entity<WritingEvaluation>(e =>
            {
                e.HasKey(x => x.WritingEvaluationId);
                e.Property(x => x.Feedback).HasColumnType("jsonb");
                e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.WritingPrompt).WithMany().HasForeignKey(x => x.WritingPromptId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => new { x.UserId, x.CreatedAt });
            });

            modelBuilder.Entity<SpeakingSession>(e =>
            {
                e.HasKey(x => x.SpeakingSessionId);
                e.Property(x => x.Turns).HasColumnType("jsonb");
                e.Property(x => x.Feedback).HasColumnType("jsonb");
                e.Property(x => x.Pronunciation).HasColumnType("jsonb");
                e.HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.SpeakingPrompt).WithMany().HasForeignKey(x => x.SpeakingPromptId).OnDelete(DeleteBehavior.Restrict);
                e.HasIndex(x => new { x.UserId, x.CreatedAt });
            });

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
