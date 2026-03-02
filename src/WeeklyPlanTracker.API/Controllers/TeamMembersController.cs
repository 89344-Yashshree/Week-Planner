using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>CRUD operations for team members. Base route: /api/team-members</summary>
[ApiController]
[Route("api/team-members")]
public class TeamMembersController : ControllerBase
{
    private readonly TeamService _teamService;

    public TeamMembersController(TeamService teamService) =>
        _teamService = teamService;

    // GET /api/team-members
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TeamMemberDto>>> GetAll()
    {
        var members = await _teamService.GetAllAsync();
        return Ok(members.Select(MapToDto));
    }

    // GET /api/team-members/{id}
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TeamMemberDto>> GetById(Guid id)
    {
        var member = await _teamService.GetByIdAsync(id);
        return member is null ? NotFound() : Ok(MapToDto(member));
    }

    // POST /api/team-members
    [HttpPost]
    public async Task<ActionResult<TeamMemberDto>> Add([FromBody] AddTeamMemberRequest req)
    {
        var member = await _teamService.AddMemberAsync(req.Name);
        return CreatedAtAction(nameof(GetById), new { id = member.Id }, MapToDto(member));
    }

    // PUT /api/team-members/{id}
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<TeamMemberDto>> Update(Guid id, [FromBody] UpdateTeamMemberRequest req)
    {
        await _teamService.UpdateNameAsync(id, req.Name);
        var updated = await _teamService.GetByIdAsync(id);
        return Ok(MapToDto(updated!));
    }

    // PUT /api/team-members/{id}/make-lead
    [HttpPut("{id:guid}/make-lead")]
    public async Task<IActionResult> MakeLead(Guid id)
    {
        await _teamService.MakeLeadAsync(id);
        return NoContent();
    }

    // DELETE /api/team-members/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id)
    {
        await _teamService.RemoveMemberAsync(id);
        return NoContent();
    }

    private static TeamMemberDto MapToDto(Core.Entities.TeamMember m) =>
        new(m.Id, m.Name, m.Role.ToString(), m.IsActive, m.CreatedAt);
}
