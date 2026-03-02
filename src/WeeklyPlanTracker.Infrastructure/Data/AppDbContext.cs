using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Infrastructure.Data;

/// <summary>
/// EF Core DbContext for the Weekly Plan Tracker application.
/// Configures all entities, relationships, and value conversions.
/// </summary>
public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<TeamMember>      TeamMembers      => Set<TeamMember>();
    public DbSet<BacklogItem>     BacklogItems      => Set<BacklogItem>();
    public DbSet<WeeklyPlan>      WeeklyPlans       => Set<WeeklyPlan>();
    public DbSet<WeeklyPlanMember> WeeklyPlanMembers => Set<WeeklyPlanMember>();
    public DbSet<PlanAssignment>  PlanAssignments   => Set<PlanAssignment>();
    public DbSet<ProgressUpdate>  ProgressUpdates   => Set<ProgressUpdate>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // ── TeamMember ────────────────────────────────────────────────────────
        modelBuilder.Entity<TeamMember>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).IsRequired().HasMaxLength(100);
            e.Property(x => x.Role).HasConversion<string>().HasMaxLength(20);
            e.HasIndex(x => x.Name);
        });

        // ── BacklogItem ───────────────────────────────────────────────────────
        modelBuilder.Entity<BacklogItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Title).IsRequired().HasMaxLength(200);
            e.Property(x => x.Description).HasMaxLength(2000);
            e.Property(x => x.Category).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.EstimatedHours).IsRequired();
        });

        // ── WeeklyPlan ────────────────────────────────────────────────────────
        modelBuilder.Entity<WeeklyPlan>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.State).HasConversion<string>().HasMaxLength(30);

            // DateOnly requires special EF 8 value converter
            e.Property(x => x.PlanningDate)
             .HasConversion(d => d.ToDateTime(TimeOnly.MinValue), v => DateOnly.FromDateTime(v));
            e.Property(x => x.WorkStartDate)
             .HasConversion(d => d.ToDateTime(TimeOnly.MinValue), v => DateOnly.FromDateTime(v));
            e.Property(x => x.WorkEndDate)
             .HasConversion(d => d.ToDateTime(TimeOnly.MinValue), v => DateOnly.FromDateTime(v));

            // Only one active (non-Completed) plan at a time — enforced at service level
            e.HasIndex(x => x.State);
        });

        // ── WeeklyPlanMember (composite PK join table) ────────────────────────
        modelBuilder.Entity<WeeklyPlanMember>(e =>
        {
            e.HasKey(x => new { x.WeeklyPlanId, x.TeamMemberId });

            e.HasOne(x => x.WeeklyPlan)
             .WithMany(p => p.WeeklyPlanMembers)
             .HasForeignKey(x => x.WeeklyPlanId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.TeamMember)
             .WithMany(m => m.WeeklyPlanMembers)
             .HasForeignKey(x => x.TeamMemberId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── PlanAssignment ────────────────────────────────────────────────────
        modelBuilder.Entity<PlanAssignment>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.CommittedHours).IsRequired();
            e.Property(x => x.HoursCompleted).HasPrecision(10, 2);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);

            // Unique constraint: a member can only assign a backlog item once per week
            e.HasIndex(x => new { x.WeeklyPlanId, x.TeamMemberId, x.BacklogItemId }).IsUnique();

            e.HasOne(x => x.WeeklyPlan)
             .WithMany(p => p.PlanAssignments)
             .HasForeignKey(x => x.WeeklyPlanId)
             .OnDelete(DeleteBehavior.Cascade);

            e.HasOne(x => x.TeamMember)
             .WithMany(m => m.PlanAssignments)
             .HasForeignKey(x => x.TeamMemberId)
             .OnDelete(DeleteBehavior.Restrict);

            e.HasOne(x => x.BacklogItem)
             .WithMany(b => b.PlanAssignments)
             .HasForeignKey(x => x.BacklogItemId)
             .OnDelete(DeleteBehavior.Restrict);
        });

        // ── ProgressUpdate ─────────────────────────────────────────────────────
        modelBuilder.Entity<ProgressUpdate>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.HoursDone).HasPrecision(10, 2);
            e.Property(x => x.Status).HasConversion<string>().HasMaxLength(30);
            e.Property(x => x.Notes).HasMaxLength(1000);

            e.HasOne(x => x.PlanAssignment)
             .WithMany(a => a.ProgressUpdates)
             .HasForeignKey(x => x.PlanAssignmentId)
             .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
