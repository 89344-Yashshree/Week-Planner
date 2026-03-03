using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>CRUD operations for backlog items. Base route: /api/backlog-items</summary>
[ApiController]
[Route("api/backlog-items")]
public class BacklogItemsController : ControllerBase
{
    private readonly BacklogService _backlogService;
    private readonly PlanningService _planningService;

    public BacklogItemsController(BacklogService backlogService, PlanningService planningService)
    {
        _backlogService = backlogService;
        _planningService = planningService;
    }

    // GET /api/backlog-items?includeArchived=false&category=ClientFocused&search=foo
    [HttpGet]
    public async Task<ActionResult<IEnumerable<BacklogItemDto>>> GetAll(
        [FromQuery] bool includeArchived = false,
        [FromQuery] BacklogCategory? category = null,
        [FromQuery] string? search = null)
    {
        var items = await _backlogService.GetAllAsync(includeArchived, category, search);

        // Determine which items are in the active plan
        var currentPlan = await _planningService.GetCurrentPlanAsync();
        var inPlanIds = new HashSet<Guid>();
        if (currentPlan != null && currentPlan.State != Core.Enums.WeekState.Completed)
        {
            var assignedIds = await _backlogService.GetAssignedItemIdsAsync(currentPlan.Id);
            inPlanIds = assignedIds.ToHashSet();
        }

        return Ok(items.Select(i => MapToDto(i, inPlanIds.Contains(i.Id))));
    }

    // GET /api/backlog-items/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<BacklogItemDto>> GetById(Guid id)
    {
        var item = await _backlogService.GetByIdAsync(id);
        return item is null ? NotFound() : Ok(MapToDto(item, false));
    }

    // POST /api/backlog-items
    [HttpPost]
    public async Task<ActionResult<BacklogItemDto>> Create([FromBody] SaveBacklogItemRequest req)
    {
        var item = await _backlogService.CreateAsync(req.Title, req.Description, req.Category, req.EstimatedHours);
        return CreatedAtAction(nameof(GetById), new { id = item.Id }, MapToDto(item, false));
    }

    // PUT /api/backlog-items/{id}
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<BacklogItemDto>> Update(Guid id, [FromBody] SaveBacklogItemRequest req)
    {
        var item = await _backlogService.UpdateAsync(id, req.Title, req.Description, req.Category, req.EstimatedHours);
        return Ok(MapToDto(item, false));
    }

    // PUT /api/backlog-items/{id}/archive
    [HttpPut("{id:guid}/archive")]
    public async Task<IActionResult> Archive(Guid id)
    {
        await _backlogService.ArchiveAsync(id);
        return NoContent();
    }

    // DELETE /api/backlog-items/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        await _backlogService.DeleteAsync(id);
        return NoContent();
    }

    private static BacklogItemDto MapToDto(Core.Entities.BacklogItem i, bool inPlan) =>
        new(i.Id, i.Title, i.Description, i.Category.ToString(),
            i.EstimatedHours, i.IsArchived, inPlan, i.CreatedAt);
}
