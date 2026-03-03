using Moq;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Services;

/// <summary>
/// Unit tests for PlanningService — the most critical service.
/// Covers state transitions, assignment rules, and all 4 freeze validation rules.
/// </summary>
public class PlanningServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IWeeklyPlanRepository> _plans = new();
    private readonly Mock<ITeamMemberRepository> _members = new();
    private readonly Mock<IPlanAssignmentRepository> _assignments = new();
    private readonly PlanningService _sut;

    public PlanningServiceTests()
    {
        _uow.Setup(u => u.WeeklyPlans).Returns(_plans.Object);
        _uow.Setup(u => u.TeamMembers).Returns(_members.Object);
        _uow.Setup(u => u.PlanAssignments).Returns(_assignments.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
        _sut = new PlanningService(_uow.Object);
    }

    // ── StartNewWeekAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task StartNewWeekAsync_NonTuesday_Throws()
    {
        var monday = new DateOnly(2025, 3, 3); // Monday
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.StartNewWeekAsync(monday));
    }

    [Fact]
    public async Task StartNewWeekAsync_ActivePlanExists_Throws()
    {
        _plans.Setup(p => p.HasActivePlanAsync()).ReturnsAsync(true);
        var tuesday = new DateOnly(2025, 3, 4);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.StartNewWeekAsync(tuesday));
    }

    [Fact]
    public async Task StartNewWeekAsync_ValidTuesday_ComputesDates()
    {
        _plans.Setup(p => p.HasActivePlanAsync()).ReturnsAsync(false);
        var tuesday = new DateOnly(2025, 3, 4);

        var plan = await _sut.StartNewWeekAsync(tuesday);

        Assert.Equal(new DateOnly(2025, 3, 5), plan.WorkStartDate); // Wednesday
        Assert.Equal(new DateOnly(2025, 3, 10), plan.WorkEndDate);  // Monday
        Assert.Equal(WeekState.Setup, plan.State);
    }

    // ── OpenPlanningAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task OpenPlanningAsync_WrongState_Throws()
    {
        var plan = MakePlan(WeekState.PlanningOpen);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.OpenPlanningAsync(plan.Id));
    }

    [Fact]
    public async Task OpenPlanningAsync_NoMembers_Throws()
    {
        var plan = MakePlan(WeekState.Setup, clientPct: 40, techPct: 40, rdPct: 20);
        // No members added
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.OpenPlanningAsync(plan.Id));
    }

    [Fact]
    public async Task OpenPlanningAsync_ValidSetup_TransitionsState()
    {
        var plan = MakePlan(WeekState.Setup, clientPct: 40, techPct: 40, rdPct: 20, memberCount: 2);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        var result = await _sut.OpenPlanningAsync(plan.Id);

        Assert.Equal(WeekState.PlanningOpen, result.State);
    }

    // ── AddAssignmentAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task AddAssignmentAsync_ZeroHours_Throws()
    {
        var plan = MakePlan(WeekState.PlanningOpen);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.AddAssignmentAsync(plan.Id, Guid.NewGuid(), Guid.NewGuid(), 0));
    }

    [Fact]
    public async Task AddAssignmentAsync_MemberNotInWeek_Throws()
    {
        var plan = MakePlan(WeekState.PlanningOpen);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        // Member ID that is NOT in plan.WeeklyPlanMembers
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.AddAssignmentAsync(plan.Id, Guid.NewGuid(), Guid.NewGuid(), 5));
    }

    [Fact]
    public async Task AddAssignmentAsync_ExceedsPersonalBudget_Throws()
    {
        var memberId = Guid.NewGuid();
        var itemId   = Guid.NewGuid();
        var plan     = MakePlan(WeekState.PlanningOpen, clientPct: 100, techPct: 0, rdPct: 0, memberCount: 1, memberId);
        var item     = new BacklogItem { Id = itemId, Category = BacklogCategory.ClientFocused, EstimatedHours = 10 };

        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        _assignments.Setup(a => a.GetByMemberItemAndWeekAsync(memberId, itemId, plan.Id)).ReturnsAsync((PlanAssignment?)null);
        var backlogRepoMock = new Mock<IBacklogItemRepository>();
        backlogRepoMock.Setup(r => r.GetByIdAsync(itemId)).ReturnsAsync(item);
        _uow.Setup(u => u.BacklogItems).Returns(backlogRepoMock.Object);
        _assignments.Setup(a => a.GetTotalCommittedHoursAsync(memberId, plan.Id)).ReturnsAsync(28); // only 2h left
        _assignments.Setup(a => a.GetByWeekAsync(plan.Id)).ReturnsAsync(new List<PlanAssignment>());

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.AddAssignmentAsync(plan.Id, memberId, itemId, 5)); // 5h but only 2h left
    }

    // ── FreezePlanAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task FreezePlanAsync_NotEnoughHoursForMember_Throws()
    {
        var memberId   = Guid.NewGuid();
        var plan       = MakePlan(WeekState.PlanningOpen, clientPct: 100, techPct: 0, rdPct: 0, memberCount: 1, memberId);
        var assignment = new PlanAssignment
        {
            TeamMemberId = memberId,
            CommittedHours = 20, // only 20, needs 30
            BacklogItem = new BacklogItem { Category = BacklogCategory.ClientFocused }
        };

        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);
        _assignments.Setup(a => a.GetByWeekAsync(plan.Id)).ReturnsAsync(new[] { assignment });
        _members.Setup(m => m.GetByIdAsync(memberId)).ReturnsAsync(new TeamMember { Name = "Alice" });

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.FreezePlanAsync(plan.Id));
    }

    [Fact]
    public async Task ValidateFreezeAsync_MemberShort_ReturnsError()
    {
        var memberId = Guid.NewGuid();
        var plan     = MakePlan(WeekState.PlanningOpen, clientPct: 100, techPct: 0, rdPct: 0, memberCount: 1, memberId);
        var assignment = new PlanAssignment
        {
            TeamMemberId   = memberId,
            CommittedHours = 10,
            BacklogItem    = new BacklogItem { Category = BacklogCategory.ClientFocused }
        };

        _assignments.Setup(a => a.GetByWeekAsync(plan.Id)).ReturnsAsync(new[] { assignment });
        _members.Setup(m => m.GetByIdAsync(memberId)).ReturnsAsync(new TeamMember { Name = "Bob" });

        var errors = await _sut.ValidateFreezeAsync(plan);

        Assert.Contains(errors, e => e.Contains("Bob"));
    }

    // ── CancelWeekAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task CancelWeekAsync_FrozenState_Throws()
    {
        var plan = MakePlan(WeekState.Frozen);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CancelWeekAsync(plan.Id));
    }

    [Fact]
    public async Task CancelWeekAsync_SetupState_RemovesPlan()
    {
        var plan = MakePlan(WeekState.Setup);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        await _sut.CancelWeekAsync(plan.Id);

        _plans.Verify(p => p.Remove(plan), Times.Once);
    }

    // ── CompleteWeekAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task CompleteWeekAsync_FrozenPlan_TransitionsToCompleted()
    {
        var plan = MakePlan(WeekState.Frozen);
        _plans.Setup(p => p.GetByIdAsync(plan.Id)).ReturnsAsync(plan);

        var result = await _sut.CompleteWeekAsync(plan.Id);

        Assert.Equal(WeekState.Completed, result.State);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static WeeklyPlan MakePlan(
        WeekState state,
        int clientPct  = 40,
        int techPct    = 40,
        int rdPct      = 20,
        int memberCount = 0,
        Guid? memberId = null)
    {
        var plan = new WeeklyPlan
        {
            Id = Guid.NewGuid(),
            State = state,
            PlanningDate   = new DateOnly(2025, 3, 4),
            WorkStartDate  = new DateOnly(2025, 3, 5),
            WorkEndDate    = new DateOnly(2025, 3, 10),
            ClientFocusedPercent = clientPct,
            TechDebtPercent      = techPct,
            RAndDPercent         = rdPct
        };

        for (int i = 0; i < memberCount; i++)
        {
            plan.WeeklyPlanMembers.Add(new WeeklyPlanMember
            {
                WeeklyPlanId  = plan.Id,
                TeamMemberId  = (i == 0 && memberId.HasValue) ? memberId.Value : Guid.NewGuid(),
                TeamMember    = new TeamMember { Name = $"Member{i}" }
            });
        }

        return plan;
    }
}
