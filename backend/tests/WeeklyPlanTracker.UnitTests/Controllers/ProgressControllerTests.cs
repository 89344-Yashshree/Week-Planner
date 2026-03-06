using Microsoft.AspNetCore.Mvc;
using Moq;
using WeeklyPlanTracker.API.Controllers;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Controllers;

/// <summary>Unit tests for ProgressController — covers GetTeamProgress, GetMemberProgress, UpdateProgress.</summary>
public class ProgressControllerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IPlanAssignmentRepository> _assignRepo = new();
    private readonly Mock<IWeeklyPlanRepository> _planRepo = new();
    private readonly ProgressController _ctrl;

    public ProgressControllerTests()
    {
        _uow.Setup(u => u.PlanAssignments).Returns(_assignRepo.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_planRepo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var svc = new ProgressService(_uow.Object);
        _ctrl = new ProgressController(svc);
    }

    private static PlanAssignment MakeAssignment(Guid memberId, BacklogCategory cat = BacklogCategory.ClientFocused) => new()
    {
        Id = Guid.NewGuid(),
        WeeklyPlanId = Guid.NewGuid(),
        TeamMemberId = memberId,
        BacklogItemId = Guid.NewGuid(),
        CommittedHours = 10,
        HoursCompleted = 5,
        Status = AssignmentStatus.InProgress,
        CreatedAt = DateTime.UtcNow,
        TeamMember = new TeamMember { Id = memberId, Name = "Alice" },
        BacklogItem = new BacklogItem { Id = Guid.NewGuid(), Title = "Task", Category = cat },
        ProgressUpdates = new List<ProgressUpdate>()
    };

    // ── GetTeamProgress ───────────────────────────────────────────────────────

    [Fact]
    public async Task GetTeamProgress_WithNoAssignments_ReturnsZeroProgress()
    {
        var weekId = Guid.NewGuid();
        _assignRepo.Setup(r => r.GetByWeekAsync(weekId)).ReturnsAsync(new List<PlanAssignment>());

        var result = await _ctrl.GetTeamProgress(weekId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TeamProgressDto>(ok.Value);
        Assert.Equal(0, dto.OverallPercent);
    }

    [Fact]
    public async Task GetTeamProgress_WithAssignments_ReturnsCorrectPercent()
    {
        var weekId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        _assignRepo.Setup(r => r.GetByWeekAsync(weekId)).ReturnsAsync(new[] { MakeAssignment(memberId) });

        var result = await _ctrl.GetTeamProgress(weekId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var dto = Assert.IsType<TeamProgressDto>(ok.Value);
        Assert.Equal(50.0m, dto.OverallPercent); // 5h done of 10h committed = 50%
    }

    // ── GetMemberProgress ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetMemberProgress_ReturnsOkDto()
    {
        var weekId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        _assignRepo.Setup(r => r.GetByMemberAndWeekAsync(memberId, weekId))
                   .ReturnsAsync(new[] { MakeAssignment(memberId) });

        var result = await _ctrl.GetMemberProgress(memberId, weekId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<MemberProgressDto>(ok.Value);
    }

    // ── UpdateProgress ────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProgress_ValidRequest_ReturnsOkDto()
    {
        var memberId = Guid.NewGuid();
        var assignment = MakeAssignment(memberId);

        // Plan must be Frozen for progress updates
        var plan = new WeeklyPlan
        {
            Id = assignment.WeeklyPlanId,
            State = WeekState.Frozen,
            PlanningDate = new DateOnly(2025, 3, 4),
            WeeklyPlanMembers = new List<WeeklyPlanMember>(),
            CreatedAt = DateTime.UtcNow
        };

        // Mock GetByIdForUpdateAsync for the UpdateProgressAsync path (AsNoTracking)
        _assignRepo.Setup(r => r.GetByIdForUpdateAsync(assignment.Id)).ReturnsAsync(assignment);
        // Mock GetStateAsync for plan state validation
        _planRepo.Setup(r => r.GetStateAsync(assignment.WeeklyPlanId)).ReturnsAsync(WeekState.Frozen);
        _assignRepo.Setup(r => r.Update(It.IsAny<PlanAssignment>()));
        _assignRepo.Setup(r => r.AddProgressUpdate(It.IsAny<ProgressUpdate>()));
        // Mock GetByIdAsync for the post-update reload in the controller
        _assignRepo.Setup(r => r.GetByIdAsync(assignment.Id)).ReturnsAsync(assignment);

        // UpdateProgressRequest(RequestingMemberId, HoursDone, Status enum, Notes)
        var req = new UpdateProgressRequest(memberId, 8m, AssignmentStatus.InProgress, "Good progress");
        var result = await _ctrl.UpdateProgress(assignment.Id, req);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<PlanAssignmentDto>(ok.Value);
    }
}
