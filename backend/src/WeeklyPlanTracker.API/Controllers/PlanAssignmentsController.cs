using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>Plan assignment operations. Base route: /api/plan-assignments</summary>
[ApiController]
[Route("api/plan-assignments")]
public class PlanAssignmentsController : ControllerBase
{
    private readonly PlanningService _planningService;

    public PlanAssignmentsController(PlanningService planningService) =>
        _planningService = planningService;

    // GET /api/plan-assignments?weekId={id}&memberId={id}
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PlanAssignmentDto>>> GetAssignments(
        [FromQuery] Guid weekId,
        [FromQuery] Guid memberId)
    {
        var assignments = await _planningService.GetMemberAssignmentsAsync(weekId, memberId);
        return Ok(assignments.Select(MapToDto));
    }

    // POST /api/plan-assignments
    [HttpPost]
    public async Task<ActionResult<PlanAssignmentDto>> AddAssignment([FromBody] AddAssignmentRequest req)
    {
        var assignment = await _planningService.AddAssignmentAsync(
            req.WeeklyPlanId, req.TeamMemberId, req.BacklogItemId, req.CommittedHours);
        return CreatedAtAction(null, MapToDto(assignment));
    }

    // DELETE /api/plan-assignments/{id}?requestingMemberId={memberId}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> RemoveAssignment(Guid id, [FromQuery] Guid requestingMemberId)
    {
        await _planningService.RemoveAssignmentAsync(id, requestingMemberId);
        return NoContent();
    }

    internal static PlanAssignmentDto MapToDto(Core.Entities.PlanAssignment a) =>
        new(a.Id,
            a.WeeklyPlanId,
            a.TeamMemberId,
            a.TeamMember?.Name ?? "",
            a.BacklogItemId,
            a.BacklogItem?.Title ?? "",
            a.BacklogItem?.Category.ToString() ?? "",
            a.CommittedHours,
            a.HoursCompleted,
            a.Status.ToString(),
            a.CreatedAt,
            a.ProgressUpdates.OrderByDescending(p => p.Timestamp)
                .Select(p => new ProgressUpdateDto(p.Id, p.Timestamp, p.HoursDone, p.Status.ToString(), p.Notes))
                .ToList());
}
