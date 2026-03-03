using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Repositories;

/// <summary>EF Core implementation of IBacklogItemRepository.</summary>
public class BacklogItemRepository : IBacklogItemRepository
{
    private readonly AppDbContext _ctx;
    public BacklogItemRepository(AppDbContext ctx) => _ctx = ctx;

    public async Task<IEnumerable<BacklogItem>> GetAllAsync(
        bool includeArchived = false,
        BacklogCategory? category = null,
        string? search = null)
    {
        var query = _ctx.BacklogItems.AsQueryable();

        if (!includeArchived)
            query = query.Where(b => !b.IsArchived);

        if (category.HasValue)
            query = query.Where(b => b.Category == category.Value);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(b => b.Title.ToLower().Contains(search.ToLower()));

        return await query.OrderBy(b => b.Category).ThenBy(b => b.Title).ToListAsync();
    }

    public Task<BacklogItem?> GetByIdAsync(Guid id) =>
        _ctx.BacklogItems.FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IEnumerable<Guid>> GetAssignedItemIdsForPlanAsync(Guid weeklyPlanId) =>
        await _ctx.PlanAssignments
            .Where(a => a.WeeklyPlanId == weeklyPlanId)
            .Select(a => a.BacklogItemId)
            .Distinct()
            .ToListAsync();

    public void Add(BacklogItem item) => _ctx.BacklogItems.Add(item);
    public void Update(BacklogItem item) => _ctx.BacklogItems.Update(item);
    public void Remove(BacklogItem item) => _ctx.BacklogItems.Remove(item);
}
