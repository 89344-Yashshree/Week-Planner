using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;

namespace WeeklyPlanTracker.Core.Services;

/// <summary>Business logic for managing backlog items.</summary>
public class BacklogService
{
    private readonly IUnitOfWork _uow;

    public BacklogService(IUnitOfWork uow) => _uow = uow;

    /// <summary>Returns backlog items with optional filters.</summary>
    public Task<IEnumerable<BacklogItem>> GetAllAsync(
        bool includeArchived = false,
        BacklogCategory? category = null,
        string? search = null) =>
        _uow.BacklogItems.GetAllAsync(includeArchived, category, search);

    /// <summary>Returns a single backlog item by ID.</summary>
    public Task<BacklogItem?> GetByIdAsync(Guid id) =>
        _uow.BacklogItems.GetByIdAsync(id);

    /// <summary>Creates a new backlog item.</summary>
    public async Task<BacklogItem> CreateAsync(string title, string? description, BacklogCategory category, int estimatedHours)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new InvalidOperationException("Title cannot be empty.");

        if (estimatedHours <= 0)
            throw new InvalidOperationException("Estimated hours must be greater than 0.");

        var item = new BacklogItem
        {
            Title = title.Trim(),
            Description = description?.Trim(),
            Category = category,
            EstimatedHours = estimatedHours
        };

        _uow.BacklogItems.Add(item);
        await _uow.SaveChangesAsync();
        return item;
    }

    /// <summary>Updates an existing backlog item's properties.</summary>
    public async Task<BacklogItem> UpdateAsync(Guid id, string title, string? description, BacklogCategory category, int estimatedHours)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new InvalidOperationException("Title cannot be empty.");

        if (estimatedHours <= 0)
            throw new InvalidOperationException("Estimated hours must be greater than 0.");

        var item = await _uow.BacklogItems.GetByIdAsync(id)
            ?? throw new InvalidOperationException("Backlog item not found.");

        item.Title = title.Trim();
        item.Description = description?.Trim();
        item.Category = category;
        item.EstimatedHours = estimatedHours;

        _uow.BacklogItems.Update(item);
        await _uow.SaveChangesAsync();
        return item;
    }

    /// <summary>Archives a backlog item so it no longer appears in the planning picker.</summary>
    public async Task ArchiveAsync(Guid id)
    {
        var item = await _uow.BacklogItems.GetByIdAsync(id)
            ?? throw new InvalidOperationException("Backlog item not found.");

        item.IsArchived = true;
        _uow.BacklogItems.Update(item);
        await _uow.SaveChangesAsync();
    }

    /// <summary>Permanently deletes a backlog item.</summary>
    public async Task DeleteAsync(Guid id)
    {
        var item = await _uow.BacklogItems.GetByIdAsync(id)
            ?? throw new InvalidOperationException("Backlog item not found.");

        _uow.BacklogItems.Remove(item);
        await _uow.SaveChangesAsync();
    }

    /// <summary>Returns IDs of all backlog items currently assigned in the given weekly plan.</summary>
    public Task<IEnumerable<Guid>> GetAssignedItemIdsAsync(Guid weeklyPlanId) =>
        _uow.BacklogItems.GetAssignedItemIdsForPlanAsync(weeklyPlanId);
}
