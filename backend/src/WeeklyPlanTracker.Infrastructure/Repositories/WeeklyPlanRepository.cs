using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Repositories;

/// <summary>EF Core implementation of IWeeklyPlanRepository.</summary>
public class WeeklyPlanRepository : IWeeklyPlanRepository
{
    private readonly AppDbContext _ctx;
    public WeeklyPlanRepository(AppDbContext ctx) => _ctx = ctx;

    public Task<WeeklyPlan?> GetCurrentAsync() =>
        _ctx.WeeklyPlans
            .Include(p => p.WeeklyPlanMembers)
                .ThenInclude(wpm => wpm.TeamMember)
            .Include(p => p.PlanAssignments)
                .ThenInclude(a => a.BacklogItem)
            .Include(p => p.PlanAssignments)
                .ThenInclude(a => a.ProgressUpdates)
            .FirstOrDefaultAsync(p => p.State != WeekState.Completed);

    public Task<WeeklyPlan?> GetByIdAsync(Guid id) =>
        _ctx.WeeklyPlans
            .Include(p => p.WeeklyPlanMembers)
                .ThenInclude(wpm => wpm.TeamMember)
            .Include(p => p.PlanAssignments)
                .ThenInclude(a => a.BacklogItem)
            .Include(p => p.PlanAssignments)
                .ThenInclude(a => a.ProgressUpdates)
            .FirstOrDefaultAsync(p => p.Id == id);

    public async Task<IEnumerable<WeeklyPlan>> GetCompletedAsync() =>
        await _ctx.WeeklyPlans
            .Include(p => p.WeeklyPlanMembers)
                .ThenInclude(wpm => wpm.TeamMember)
            .Include(p => p.PlanAssignments)
                .ThenInclude(a => a.BacklogItem)
            .Where(p => p.State == WeekState.Completed)
            .OrderByDescending(p => p.PlanningDate)
            .ToListAsync();

    public Task<bool> HasActivePlanAsync() =>
        _ctx.WeeklyPlans.AnyAsync(p => p.State != WeekState.Completed);

    public void Add(WeeklyPlan plan) => _ctx.WeeklyPlans.Add(plan);
    public void Update(WeeklyPlan plan) => _ctx.WeeklyPlans.Update(plan);
    public void Remove(WeeklyPlan plan) => _ctx.WeeklyPlans.Remove(plan);
}
