namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>
/// Unit of Work pattern — coordinates saving changes across all repositories
/// in a single atomic database transaction.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    ITeamMemberRepository TeamMembers { get; }
    IBacklogItemRepository BacklogItems { get; }
    IWeeklyPlanRepository WeeklyPlans { get; }
    IPlanAssignmentRepository PlanAssignments { get; }

    /// <summary>Persists all pending changes to the database.</summary>
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
