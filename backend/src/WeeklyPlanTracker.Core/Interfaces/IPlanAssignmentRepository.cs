using WeeklyPlanTracker.Core.Entities;

namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>Repository contract for plan assignment data access operations.</summary>
public interface IPlanAssignmentRepository
{
    Task<IEnumerable<PlanAssignment>> GetByWeekAsync(Guid weeklyPlanId);
    Task<IEnumerable<PlanAssignment>> GetByMemberAndWeekAsync(Guid teamMemberId, Guid weeklyPlanId);
    Task<PlanAssignment?> GetByIdAsync(Guid id);
    Task<PlanAssignment?> GetByMemberItemAndWeekAsync(Guid teamMemberId, Guid backlogItemId, Guid weeklyPlanId);
    /// <summary>Returns total committed hours for the given member in the given week.</summary>
    Task<int> GetTotalCommittedHoursAsync(Guid teamMemberId, Guid weeklyPlanId);
    void Add(PlanAssignment assignment);
    void Update(PlanAssignment assignment);
    void Remove(PlanAssignment assignment);
}
