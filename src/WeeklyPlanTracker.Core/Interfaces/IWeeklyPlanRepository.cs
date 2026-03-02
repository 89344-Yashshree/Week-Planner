using WeeklyPlanTracker.Core.Entities;

namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>Repository contract for weekly plan data access operations.</summary>
public interface IWeeklyPlanRepository
{
    /// <summary>Returns the single active plan (not Completed), or null if none exists.</summary>
    Task<WeeklyPlan?> GetCurrentAsync();
    Task<WeeklyPlan?> GetByIdAsync(Guid id);
    Task<IEnumerable<WeeklyPlan>> GetCompletedAsync();
    Task<bool> HasActivePlanAsync();
    void Add(WeeklyPlan plan);
    void Update(WeeklyPlan plan);
    void Remove(WeeklyPlan plan);
}
