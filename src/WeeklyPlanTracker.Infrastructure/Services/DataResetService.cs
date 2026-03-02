using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Services;

/// <summary>
/// Infrastructure implementation of IDataResetService.
/// Deletes all rows from all tables in reverse FK-dependency order.
/// </summary>
public class DataResetService : IDataResetService
{
    private readonly AppDbContext _ctx;

    public DataResetService(AppDbContext ctx) => _ctx = ctx;

    public async Task ResetAllAsync()
    {
        // Delete in reverse dependency order to respect foreign-key constraints
        _ctx.Set<ProgressUpdate>().RemoveRange(_ctx.Set<ProgressUpdate>());
        _ctx.Set<PlanAssignment>().RemoveRange(_ctx.Set<PlanAssignment>());
        _ctx.Set<WeeklyPlanMember>().RemoveRange(_ctx.Set<WeeklyPlanMember>());
        _ctx.Set<WeeklyPlan>().RemoveRange(_ctx.Set<WeeklyPlan>());
        _ctx.Set<BacklogItem>().RemoveRange(_ctx.Set<BacklogItem>());
        _ctx.Set<TeamMember>().RemoveRange(_ctx.Set<TeamMember>());
        await _ctx.SaveChangesAsync();
    }
}
