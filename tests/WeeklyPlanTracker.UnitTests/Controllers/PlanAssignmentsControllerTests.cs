using Microsoft.AspNetCore.Mvc;
using Moq;
using WeeklyPlanTracker.API.Controllers;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;
using WeeklyPlanTracker.API.DTOs;

namespace WeeklyPlanTracker.UnitTests.Controllers;

/// <summary>Unit tests for PlanAssignmentsController — covers GetAssignments, AddAssignment, RemoveAssignment.</summary>
public class PlanAssignmentsControllerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IPlanAssignmentRepository> _assignRepo = new();
    private readonly Mock<IBacklogItemRepository> _backlogRepo = new();
    private readonly Mock<IWeeklyPlanRepository> _planRepo = new();
    private readonly PlanAssignmentsController _ctrl;

    public PlanAssignmentsControllerTests()
    {
        _uow.Setup(u => u.PlanAssignments).Returns(_assignRepo.Object);
        _uow.Setup(u => u.BacklogItems).Returns(_backlogRepo.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_planRepo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var svc = new PlanningService(_uow.Object);
        _ctrl = new PlanAssignmentsController(svc);
    }

    private static PlanAssignment MakeAssignment(Guid planId, Guid memberId, Guid itemId) => new()
    {
        Id = Guid.NewGuid(),
        WeeklyPlanId = planId,
        TeamMemberId = memberId,
        BacklogItemId = itemId,
        CommittedHours = 8,
        HoursCompleted = 0,
        Status = AssignmentStatus.NotStarted,
        CreatedAt = DateTime.UtcNow,
        TeamMember = new TeamMember { Id = memberId, Name = "Alice" },
        BacklogItem = new BacklogItem { Id = itemId, Title = "Task", Category = BacklogCategory.ClientFocused },
        ProgressUpdates = new List<ProgressUpdate>()
    };

    // ── GetAssignments ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAssignments_ReturnsOkWithList()
    {
        var planId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var assignment = MakeAssignment(planId, memberId, Guid.NewGuid());

        _assignRepo.Setup(r => r.GetByMemberAndWeekAsync(memberId, planId))
                   .ReturnsAsync(new[] { assignment });

        var result = await _ctrl.GetAssignments(planId, memberId);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
    }

    // ── AddAssignment ─────────────────────────────────────────────────────────

    [Fact]
    public async Task AddAssignment_ValidRequest_Returns201()
    {
        var planId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var itemId = Guid.NewGuid();

        var plan = new WeeklyPlan
        {
            Id = planId,
            State = WeekState.PlanningOpen,
            ClientFocusedPercent = 100, TechDebtPercent = 0, RAndDPercent = 0,
            WeeklyPlanMembers = new List<WeeklyPlanMember>
            {
                new() { WeeklyPlanId = planId, TeamMemberId = memberId,
                    TeamMember = new TeamMember { Id = memberId, Name = "Alice", Role = MemberRole.Lead } }
            },
            CreatedAt = DateTime.UtcNow,
            PlanningDate = new DateOnly(2025, 3, 4)
        };

        var item = new BacklogItem { Id = itemId, Title = "Task", Category = BacklogCategory.ClientFocused, EstimatedHours = 8 };

        _planRepo.Setup(r => r.GetByIdAsync(planId)).ReturnsAsync(plan);
        _backlogRepo.Setup(r => r.GetByIdAsync(itemId)).ReturnsAsync(item);
        _assignRepo.Setup(r => r.GetByMemberItemAndWeekAsync(memberId, itemId, planId)).ReturnsAsync((PlanAssignment?)null);
        _assignRepo.Setup(r => r.GetTotalCommittedHoursAsync(memberId, planId)).ReturnsAsync(0);
        _assignRepo.Setup(r => r.GetByWeekAsync(planId)).ReturnsAsync(new List<PlanAssignment>());
        _assignRepo.Setup(r => r.Add(It.IsAny<PlanAssignment>()));

        var result = await _ctrl.AddAssignment(new AddAssignmentRequest(planId, memberId, itemId, 8));

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }

    // ── RemoveAssignment ──────────────────────────────────────────────────────

    [Fact]
    public async Task RemoveAssignment_WhenExists_ReturnsNoContent()
    {
        var planId = Guid.NewGuid();
        var memberId = Guid.NewGuid();
        var assignment = MakeAssignment(planId, memberId, Guid.NewGuid());

        var plan = new WeeklyPlan
        {
            Id = planId,
            State = WeekState.PlanningOpen,
            PlanningDate = new DateOnly(2025, 3, 4),
            WeeklyPlanMembers = new List<WeeklyPlanMember>(),
            CreatedAt = DateTime.UtcNow
        };

        _assignRepo.Setup(r => r.GetByIdAsync(assignment.Id)).ReturnsAsync(assignment);
        _planRepo.Setup(r => r.GetByIdAsync(planId)).ReturnsAsync(plan);
        _assignRepo.Setup(r => r.Remove(It.IsAny<PlanAssignment>()));

        var result = await _ctrl.RemoveAssignment(assignment.Id, memberId);

        Assert.IsType<NoContentResult>(result);
    }
}
