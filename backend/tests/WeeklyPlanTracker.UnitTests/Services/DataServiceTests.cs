using Moq;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Services;

/// <summary>
/// Unit tests for DataService — covers Seed, Export, and Reset operations.
/// All dependencies are mocked to isolate business logic.
/// </summary>
public class DataServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ITeamMemberRepository> _members = new();
    private readonly Mock<IBacklogItemRepository> _backlog = new();
    private readonly Mock<IWeeklyPlanRepository> _plans = new();
    private readonly Mock<IPlanAssignmentRepository> _assignments = new();
    private readonly Mock<IDataResetService> _reset = new();
    private readonly DataService _sut;

    public DataServiceTests()
    {
        _uow.Setup(u => u.TeamMembers).Returns(_members.Object);
        _uow.Setup(u => u.BacklogItems).Returns(_backlog.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_plans.Object);
        _uow.Setup(u => u.PlanAssignments).Returns(_assignments.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        _sut = new DataService(_uow.Object, _reset.Object);
    }

    // ── SeedSampleDataAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task SeedSampleDataAsync_CallsResetThenAddsTeamMembers()
    {
        _reset.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        await _sut.SeedSampleDataAsync();

        // Should reset first, then add 4 members + 10 backlog items
        _reset.Verify(r => r.ResetAllAsync(), Times.Once);
        _members.Verify(m => m.Add(It.IsAny<TeamMember>()), Times.Exactly(4));
    }

    [Fact]
    public async Task SeedSampleDataAsync_AddsExactlyTenBacklogItems()
    {
        _reset.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        await _sut.SeedSampleDataAsync();

        _backlog.Verify(b => b.Add(It.IsAny<BacklogItem>()), Times.Exactly(10));
    }

    [Fact]
    public async Task SeedSampleDataAsync_FirstMemberIsLead()
    {
        _reset.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        TeamMember? capturedLead = null;
        _members.Setup(m => m.Add(It.IsAny<TeamMember>()))
                .Callback<TeamMember>(m => capturedLead ??= m);

        await _sut.SeedSampleDataAsync();

        Assert.NotNull(capturedLead);
        Assert.Equal(MemberRole.Lead, capturedLead.Role);
        Assert.Equal("Alice Chen", capturedLead.Name);
    }

    [Fact]
    public async Task SeedSampleDataAsync_BacklogItemsSpanAllCategories()
    {
        _reset.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        var captured = new List<BacklogItem>();
        _backlog.Setup(b => b.Add(It.IsAny<BacklogItem>()))
                .Callback<BacklogItem>(item => captured.Add(item));

        await _sut.SeedSampleDataAsync();

        Assert.Contains(captured, i => i.Category == BacklogCategory.ClientFocused);
        Assert.Contains(captured, i => i.Category == BacklogCategory.TechDebt);
        Assert.Contains(captured, i => i.Category == BacklogCategory.RAndD);
    }

    // ── ResetAllDataAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task ResetAllDataAsync_DelegatesToResetService()
    {
        _reset.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        await _sut.ResetAllDataAsync();

        _reset.Verify(r => r.ResetAllAsync(), Times.Once);
    }

    // ── ExportAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task ExportAsync_ReturnsNonEmptyJsonBytes()
    {
        _members.Setup(m => m.GetAllActiveAsync())
                .ReturnsAsync(new[] { new TeamMember { Name = "Alice", Role = MemberRole.Lead } });
        // null literals are valid in expression trees; It.IsAny<BacklogCategory?>() causes CS0854
        _backlog.Setup(b => b.GetAllAsync(It.IsAny<bool>(), null, null))
                .ReturnsAsync(Array.Empty<BacklogItem>());
        _plans.Setup(p => p.GetCompletedAsync())
              .ReturnsAsync(Array.Empty<WeeklyPlan>());
        _plans.Setup(p => p.GetCurrentAsync())
              .ReturnsAsync((WeeklyPlan?)null);

        var bytes = await _sut.ExportAsync();

        Assert.NotNull(bytes);
        Assert.True(bytes.Length > 0);

        // Should be valid JSON containing the team member
        var json = System.Text.Encoding.UTF8.GetString(bytes);
        Assert.Contains("TeamMembers", json);
        Assert.Contains("Alice", json);
    }
}
