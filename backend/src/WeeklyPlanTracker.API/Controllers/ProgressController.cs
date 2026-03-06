using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>Progress tracking operations. Base route: /api/progress</summary>
[ApiController]
[Route("api/progress")]
public class ProgressController : ControllerBase
{
    private readonly ProgressService _progressService;

    public ProgressController(ProgressService progressService) =>
        _progressService = progressService;

    // GET /api/progress/team?weekId={id}
    [HttpGet("team")]
    public async Task<ActionResult<TeamProgressDto>> GetTeamProgress([FromQuery] Guid weekId)
    {
        var assignments = (await _progressService.GetTeamAssignmentsAsync(weekId)).ToList();

        if (!assignments.Any())
            return Ok(new TeamProgressDto(0, 0, 0, 0, 0, new(), new()));

        var totalCommitted = assignments.Sum(a => a.CommittedHours);
        var totalDone = assignments.Sum(a => a.HoursCompleted);
        var overallPercent = totalCommitted > 0 ? Math.Round(totalDone / totalCommitted * 100, 1) : 0;

        // By category
        var byCategory = assignments
            .GroupBy(a => a.BacklogItem.Category)
            .Select(g => new CategoryProgressDto(
                g.Key.ToString(),
                g.Sum(a => a.CommittedHours),
                g.Sum(a => a.HoursCompleted)))
            .ToList();

        // By member
        var byMember = assignments
            .GroupBy(a => new { a.TeamMemberId, a.TeamMember.Name })
            .Select(g => new MemberProgressDto(
                g.Key.TeamMemberId,
                g.Key.Name,
                g.Sum(a => a.CommittedHours),
                g.Sum(a => a.HoursCompleted),
                g.Select(PlanAssignmentsController.MapToDto).ToList()))
            .ToList();

        return Ok(new TeamProgressDto(
            overallPercent,
            totalCommitted,
            totalDone,
            assignments.Count(a => a.Status == AssignmentStatus.Done),
            assignments.Count(a => a.Status == AssignmentStatus.Blocked),
            byCategory,
            byMember));
    }

    // GET /api/progress/member/{memberId}?weekId={id}
    [HttpGet("member/{memberId:guid}")]
    public async Task<ActionResult<MemberProgressDto>> GetMemberProgress(Guid memberId, [FromQuery] Guid weekId)
    {
        var assignments = (await _progressService.GetMemberAssignmentsAsync(weekId, memberId)).ToList();

        var memberName = assignments.FirstOrDefault()?.TeamMember?.Name ?? "Unknown";
        var dto = new MemberProgressDto(
            memberId,
            memberName,
            assignments.Sum(a => a.CommittedHours),
            assignments.Sum(a => a.HoursCompleted),
            assignments.Select(PlanAssignmentsController.MapToDto).ToList());

        return Ok(dto);
    }

    // PUT /api/progress/{assignmentId}
    [HttpPut("{assignmentId:guid}")]
    public async Task<ActionResult<PlanAssignmentDto>> UpdateProgress(
        Guid assignmentId,
        [FromBody] UpdateProgressRequest req)
    {
        await _progressService.UpdateProgressAsync(
            assignmentId, req.RequestingMemberId, req.HoursDone, req.Status, req.Notes);
        // Reload the full entity with nav properties so the DTO has populated fields
        var full = await _progressService.GetAssignmentByIdAsync(assignmentId);
        return Ok(PlanAssignmentsController.MapToDto(full!));
    }

    // GET /api/progress/{assignmentId}/history
    [HttpGet("{assignmentId:guid}/history")]
    public async Task<ActionResult<IEnumerable<ProgressUpdateDto>>> GetHistory(Guid assignmentId)
    {
        var target = await _progressService.GetAssignmentByIdAsync(assignmentId);
        if (target is null) return NotFound();

        var history = target.ProgressUpdates
            .OrderByDescending(p => p.Timestamp)
            .Select(p => new ProgressUpdateDto(p.Id, p.Timestamp, p.HoursDone, p.Status.ToString(), p.Notes));

        return Ok(history);
    }
}
