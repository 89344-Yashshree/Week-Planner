using Microsoft.AspNetCore.Mvc;
using Moq;
using WeeklyPlanTracker.API.Controllers;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Controllers;

/// <summary>Unit tests for TeamMembersController — covers all 5 action methods.</summary>
public class TeamMembersControllerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ITeamMemberRepository> _repo = new();
    private readonly TeamMembersController _ctrl;

    public TeamMembersControllerTests()
    {
        _uow.Setup(u => u.TeamMembers).Returns(_repo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
        var svc = new TeamService(_uow.Object);
        _ctrl = new TeamMembersController(svc);
    }

    private static TeamMember MakeMember(string name = "Alice", MemberRole role = MemberRole.Lead) =>
        new() { Id = Guid.NewGuid(), Name = name, Role = role, IsActive = true, CreatedAt = DateTime.UtcNow };

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsOkWithMembers()
    {
        var members = new[] { MakeMember("Alice", MemberRole.Lead), MakeMember("Bob", MemberRole.Member) };
        _repo.Setup(r => r.GetAllActiveAsync()).ReturnsAsync(members);

        var result = await _ctrl.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dtos = Assert.IsAssignableFrom<IEnumerable<TeamMemberDto>>(ok.Value);
        Assert.Equal(2, dtos.Count());
    }

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenFound_ReturnsOk()
    {
        var member = MakeMember();
        _repo.Setup(r => r.GetByIdAsync(member.Id)).ReturnsAsync(member);

        var result = await _ctrl.GetById(member.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TeamMemberDto>(ok.Value);
        Assert.Equal(member.Id, dto.Id);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((TeamMember?)null);

        var result = await _ctrl.GetById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Add_ValidName_ReturnsCreated201()
    {
        // Expression trees require all args including optional ones — cast null explicitly for Guid?
        _repo.Setup(r => r.ExistsWithNameAsync(It.IsAny<string>(), (Guid?)null)).ReturnsAsync(false);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(0);
        _repo.Setup(r => r.Add(It.IsAny<TeamMember>()));

        var result = await _ctrl.Add(new AddTeamMemberRequest("Charlie"));

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        Assert.Equal(201, created.StatusCode);
    }

    // ── MakeLead ──────────────────────────────────────────────────────────────

    [Fact]
    public async Task MakeLead_WhenValid_ReturnsNoContent()
    {
        var lead = MakeMember("Alice", MemberRole.Lead);
        var bob = MakeMember("Bob", MemberRole.Member);
        _repo.Setup(r => r.GetByIdAsync(bob.Id)).ReturnsAsync(bob);
        _repo.Setup(r => r.GetLeadAsync()).ReturnsAsync(lead);

        var result = await _ctrl.MakeLead(bob.Id);

        Assert.IsType<NoContentResult>(result);
    }

    // ── Remove ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Remove_WhenValid_ReturnsNoContent()
    {
        var bob = MakeMember("Bob", MemberRole.Member);
        _repo.Setup(r => r.GetByIdAsync(bob.Id)).ReturnsAsync(bob);
        // Must return > 1 so the service knows it's not the last member
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(2);
        _repo.Setup(r => r.Update(It.IsAny<TeamMember>()));

        var result = await _ctrl.Remove(bob.Id);

        Assert.IsType<NoContentResult>(result);
    }
}
