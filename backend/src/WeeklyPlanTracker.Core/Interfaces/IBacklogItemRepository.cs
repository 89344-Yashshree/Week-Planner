using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>Repository contract for backlog item data access operations.</summary>
public interface IBacklogItemRepository
{
    Task<IEnumerable<BacklogItem>> GetAllAsync(bool includeArchived = false, BacklogCategory? category = null, string? search = null);
    Task<BacklogItem?> GetByIdAsync(Guid id);
    /// <summary>Returns IDs of backlog items currently assigned in a given weekly plan.</summary>
    Task<IEnumerable<Guid>> GetAssignedItemIdsForPlanAsync(Guid weeklyPlanId);
    void Add(BacklogItem item);
    void Update(BacklogItem item);
    void Remove(BacklogItem item);
}
