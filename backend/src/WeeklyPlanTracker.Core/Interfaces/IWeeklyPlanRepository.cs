using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>Repository contract for weekly plan data access operations.</summary>
public interface IWeeklyPlanRepository
{
    /// <summary>Returns the single active plan (not Completed), or null if none exists.</summary>
    Task<WeeklyPlan?> GetCurrentAsync();
    Task<WeeklyPlan?> GetByIdAsync(Guid id);
    Task<IEnumerable<WeeklyPlan>> GetCompletedAsync();
    Task<bool> HasActivePlanAsync();
    /// <summary>Returns only the State of the plan with the given ID, without loading navigation properties.</summary>
    Task<WeekState?> GetStateAsync(Guid id);
    void Add(WeeklyPlan plan);
    void Update(WeeklyPlan plan);
    void Remove(WeeklyPlan plan);
}
