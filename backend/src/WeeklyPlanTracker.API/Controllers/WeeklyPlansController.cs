using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>Weekly plan lifecycle operations. Base route: /api/weekly-plans</summary>
[ApiController]
[Route("api/weekly-plans")]
public class WeeklyPlansController : ControllerBase
{
    private readonly PlanningService _planningService;
    private readonly TeamService _teamService;

    public WeeklyPlansController(PlanningService planningService, TeamService teamService)
    {
        _planningService = planningService;
        _teamService = teamService;
    }

    // GET /api/weekly-plans/current
    [HttpGet("current")]
    public async Task<ActionResult<WeeklyPlanDto>> GetCurrent()
    {
        var plan = await _planningService.GetCurrentPlanAsync();
        return plan is null ? NoContent() : Ok(await MapToDtoAsync(plan));
    }

    // GET /api/weekly-plans/past
    [HttpGet("past")]
    public async Task<ActionResult<IEnumerable<WeeklyPlanDto>>> GetPast()
    {
        var plans = await _planningService.GetPastWeeksAsync();
        var dtos = new List<WeeklyPlanDto>();
        foreach (var p in plans) dtos.Add(await MapToDtoAsync(p));
        return Ok(dtos);
    }

    // GET /api/weekly-plans/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WeeklyPlanDto>> GetById(Guid id)
    {
        var plan = await _planningService.GetByIdAsync(id);
        return plan is null ? NotFound() : Ok(await MapToDtoAsync(plan));
    }

    // POST /api/weekly-plans — Start a new week
    [HttpPost]
    public async Task<ActionResult<WeeklyPlanDto>> StartWeek([FromBody] StartWeekRequest req)
    {
        var date = DateOnly.Parse(req.PlanningDate);
        var plan = await _planningService.StartNewWeekAsync(date);
        return CreatedAtAction(nameof(GetById), new { id = plan.Id }, await MapToDtoAsync(plan));
    }

    // PUT /api/weekly-plans/{id}/setup — Configure plan (members + %)
    [HttpPut("{id:guid}/setup")]
    public async Task<ActionResult<WeeklyPlanDto>> SetupPlan(Guid id, [FromBody] ConfigurePlanRequest req)
    {
        var plan = await _planningService.ConfigurePlanAsync(
            id, req.MemberIds,
            req.ClientFocusedPercent, req.TechDebtPercent, req.RAndDPercent);
        return Ok(await MapToDtoAsync(plan));
    }

    // PUT /api/weekly-plans/{id}/open-planning
    [HttpPut("{id:guid}/open-planning")]
    public async Task<ActionResult<WeeklyPlanDto>> OpenPlanning(Guid id)
    {
        var plan = await _planningService.OpenPlanningAsync(id);
        return Ok(await MapToDtoAsync(plan));
    }

    // PUT /api/weekly-plans/{id}/freeze
    [HttpPut("{id:guid}/freeze")]
    public async Task<ActionResult<WeeklyPlanDto>> Freeze(Guid id)
    {
        var plan = await _planningService.FreezePlanAsync(id);
        return Ok(await MapToDtoAsync(plan));
    }

    // GET /api/weekly-plans/{id}/freeze-validation
    [HttpGet("{id:guid}/freeze-validation")]
    public async Task<ActionResult<List<string>>> GetFreezeValidation(Guid id)
    {
        var plan = await _planningService.GetByIdAsync(id);
        if (plan is null) return NotFound();
        var errors = await _planningService.ValidateFreezeAsync(plan);
        return Ok(errors);
    }

    // PUT /api/weekly-plans/{id}/complete
    [HttpPut("{id:guid}/complete")]
    public async Task<ActionResult<WeeklyPlanDto>> Complete(Guid id)
    {
        var plan = await _planningService.CompleteWeekAsync(id);
        return Ok(await MapToDtoAsync(plan));
    }

    // DELETE /api/weekly-plans/{id} — Cancel
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        await _planningService.CancelWeekAsync(id);
        return NoContent();
    }

    private async Task<WeeklyPlanDto> MapToDtoAsync(Core.Entities.WeeklyPlan plan)
    {
        var selectedMembers = plan.WeeklyPlanMembers
            .Select(wpm => new TeamMemberDto(
                wpm.TeamMember.Id,
                wpm.TeamMember.Name,
                wpm.TeamMember.Role.ToString(),
                wpm.TeamMember.IsActive,
                wpm.TeamMember.CreatedAt))
            .ToList();

        return new WeeklyPlanDto(
            plan.Id,
            plan.PlanningDate.ToString("yyyy-MM-dd"),
            plan.WorkStartDate.ToString("yyyy-MM-dd"),
            plan.WorkEndDate.ToString("yyyy-MM-dd"),
            plan.State.ToString(),
            plan.ClientFocusedPercent,
            plan.TechDebtPercent,
            plan.RAndDPercent,
            plan.MemberCount,
            plan.TotalHours,
            plan.ClientFocusedBudgetHours,
            plan.TechDebtBudgetHours,
            plan.RAndDBudgetHours,
            plan.WorkPeriodDisplay,
            selectedMembers);
    }
}
