using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Repositories;

/// <summary>
/// Unit of Work implementation that co-ordinates all repositories over
/// a single AppDbContext instance, ensuring changes are saved atomically.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly AppDbContext _ctx;

    public UnitOfWork(
        AppDbContext ctx,
        ITeamMemberRepository teamMembers,
        IBacklogItemRepository backlogItems,
        IWeeklyPlanRepository weeklyPlans,
        IPlanAssignmentRepository planAssignments)
    {
        _ctx = ctx;
        TeamMembers = teamMembers;
        BacklogItems = backlogItems;
        WeeklyPlans = weeklyPlans;
        PlanAssignments = planAssignments;
    }

    public ITeamMemberRepository TeamMembers { get; }
    public IBacklogItemRepository BacklogItems { get; }
    public IWeeklyPlanRepository WeeklyPlans { get; }
    public IPlanAssignmentRepository PlanAssignments { get; }

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _ctx.SaveChangesAsync(cancellationToken);

    public void Dispose() => _ctx.Dispose();
}
