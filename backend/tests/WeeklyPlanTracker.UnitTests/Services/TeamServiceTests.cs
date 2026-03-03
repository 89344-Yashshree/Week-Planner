using Moq;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Services;

/// <summary>Unit tests for TeamService business logic.</summary>
public class TeamServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ITeamMemberRepository> _repo = new();
    private readonly TeamService _sut;

    public TeamServiceTests()
    {
        _uow.Setup(u => u.TeamMembers).Returns(_repo.Object);
        _sut = new TeamService(_uow.Object);
    }

    // ── AddMemberAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task AddMemberAsync_FirstMember_IsLead()
    {
        // Arrange
        _repo.Setup(r => r.ExistsWithNameAsync("Alice", null)).ReturnsAsync(false);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(0);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        TeamMember? added = null;
        _repo.Setup(r => r.Add(It.IsAny<TeamMember>()))
             .Callback<TeamMember>(m => added = m);

        // Act
        var result = await _sut.AddMemberAsync("Alice");

        // Assert
        Assert.Equal(MemberRole.Lead, result.Role);
    }

    [Fact]
    public async Task AddMemberAsync_SecondMember_IsMember()
    {
        _repo.Setup(r => r.ExistsWithNameAsync("Bob", null)).ReturnsAsync(false);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(1);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var result = await _sut.AddMemberAsync("Bob");

        Assert.Equal(MemberRole.Member, result.Role);
    }

    [Fact]
    public async Task AddMemberAsync_EmptyName_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.AddMemberAsync("   "));
    }

    [Fact]
    public async Task AddMemberAsync_DuplicateName_Throws()
    {
        _repo.Setup(r => r.ExistsWithNameAsync("Alice", null)).ReturnsAsync(true);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.AddMemberAsync("Alice"));
    }

    // ── MakeLeadAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task MakeLeadAsync_DemotesPreviousLead()
    {
        var oldLead = new TeamMember { Id = Guid.NewGuid(), Role = MemberRole.Lead, IsActive = true };
        var newLead = new TeamMember { Id = Guid.NewGuid(), Role = MemberRole.Member, IsActive = true };

        _repo.Setup(r => r.GetByIdAsync(newLead.Id)).ReturnsAsync(newLead);
        _repo.Setup(r => r.GetLeadAsync()).ReturnsAsync(oldLead);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        await _sut.MakeLeadAsync(newLead.Id);

        Assert.Equal(MemberRole.Lead, newLead.Role);
        Assert.Equal(MemberRole.Member, oldLead.Role);
    }

    [Fact]
    public async Task MakeLeadAsync_MemberNotFound_Throws()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((TeamMember?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.MakeLeadAsync(Guid.NewGuid()));
    }

    // ── RemoveMemberAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task RemoveMemberAsync_LastMember_Throws()
    {
        var member = new TeamMember { Id = Guid.NewGuid(), Role = MemberRole.Member, IsActive = true };
        _repo.Setup(r => r.GetByIdAsync(member.Id)).ReturnsAsync(member);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(1); // only 1 left

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.RemoveMemberAsync(member.Id));
    }

    [Fact]
    public async Task RemoveMemberAsync_Lead_Throws()
    {
        var lead = new TeamMember { Id = Guid.NewGuid(), Role = MemberRole.Lead, IsActive = true };
        _repo.Setup(r => r.GetByIdAsync(lead.Id)).ReturnsAsync(lead);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(3);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.RemoveMemberAsync(lead.Id));
    }

    [Fact]
    public async Task RemoveMemberAsync_ValidMember_SoftDeletes()
    {
        var member = new TeamMember { Id = Guid.NewGuid(), Role = MemberRole.Member, IsActive = true };
        _repo.Setup(r => r.GetByIdAsync(member.Id)).ReturnsAsync(member);
        _repo.Setup(r => r.CountActiveAsync()).ReturnsAsync(3);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        await _sut.RemoveMemberAsync(member.Id);

        Assert.False(member.IsActive);
    }
}
