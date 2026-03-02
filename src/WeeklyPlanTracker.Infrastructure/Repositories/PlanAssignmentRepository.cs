using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Repositories;

/// <summary>EF Core implementation of IPlanAssignmentRepository.</summary>
public class PlanAssignmentRepository : IPlanAssignmentRepository
{
    private readonly AppDbContext _ctx;
    public PlanAssignmentRepository(AppDbContext ctx) => _ctx = ctx;

    public async Task<IEnumerable<PlanAssignment>> GetByWeekAsync(Guid weeklyPlanId) =>
        await _ctx.PlanAssignments
            .Include(a => a.BacklogItem)
            .Include(a => a.TeamMember)
            .Include(a => a.ProgressUpdates)
            .Where(a => a.WeeklyPlanId == weeklyPlanId)
            .ToListAsync();

    public async Task<IEnumerable<PlanAssignment>> GetByMemberAndWeekAsync(Guid teamMemberId, Guid weeklyPlanId) =>
        await _ctx.PlanAssignments
            .Include(a => a.BacklogItem)
            .Include(a => a.ProgressUpdates)
            .Where(a => a.WeeklyPlanId == weeklyPlanId && a.TeamMemberId == teamMemberId)
            .ToListAsync();

    public Task<PlanAssignment?> GetByIdAsync(Guid id) =>
        _ctx.PlanAssignments
            .Include(a => a.BacklogItem)
            .Include(a => a.ProgressUpdates)
            .FirstOrDefaultAsync(a => a.Id == id);

    public Task<PlanAssignment?> GetByMemberItemAndWeekAsync(Guid teamMemberId, Guid backlogItemId, Guid weeklyPlanId) =>
        _ctx.PlanAssignments
            .FirstOrDefaultAsync(a =>
                a.TeamMemberId == teamMemberId &&
                a.BacklogItemId == backlogItemId &&
                a.WeeklyPlanId == weeklyPlanId);

    public async Task<int> GetTotalCommittedHoursAsync(Guid teamMemberId, Guid weeklyPlanId) =>
        await _ctx.PlanAssignments
            .Where(a => a.TeamMemberId == teamMemberId && a.WeeklyPlanId == weeklyPlanId)
            .SumAsync(a => a.CommittedHours);

    public void Add(PlanAssignment assignment) => _ctx.PlanAssignments.Add(assignment);
    public void Update(PlanAssignment assignment) => _ctx.PlanAssignments.Update(assignment);
    public void Remove(PlanAssignment assignment) => _ctx.PlanAssignments.Remove(assignment);
}
