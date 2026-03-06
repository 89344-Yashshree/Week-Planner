using Moq;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Services;

/// <summary>Unit tests for ProgressService.</summary>
public class ProgressServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IPlanAssignmentRepository> _assignRepo = new();
    private readonly Mock<IWeeklyPlanRepository> _planRepo = new();
    private readonly ProgressService _sut;

    public ProgressServiceTests()
    {
        _uow.Setup(u => u.PlanAssignments).Returns(_assignRepo.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_planRepo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);
        _sut = new ProgressService(_uow.Object);
    }

    [Fact]
    public async Task UpdateProgressAsync_NegativeHours_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateProgressAsync(Guid.NewGuid(), Guid.NewGuid(), -1, AssignmentStatus.InProgress, null));
    }

    [Fact]
    public async Task UpdateProgressAsync_AssignmentNotFound_Throws()
    {
        _assignRepo.Setup(r => r.GetByIdForUpdateAsync(It.IsAny<Guid>())).ReturnsAsync((PlanAssignment?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateProgressAsync(Guid.NewGuid(), Guid.NewGuid(), 5, AssignmentStatus.InProgress, null));
    }

    [Fact]
    public async Task UpdateProgressAsync_WrongOwner_Throws()
    {
        var realOwner  = Guid.NewGuid();
        var otherUser  = Guid.NewGuid();
        var assignment = new PlanAssignment { Id = Guid.NewGuid(), TeamMemberId = realOwner, WeeklyPlanId = Guid.NewGuid() };

        _assignRepo.Setup(r => r.GetByIdForUpdateAsync(assignment.Id)).ReturnsAsync(assignment);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateProgressAsync(assignment.Id, otherUser, 5, AssignmentStatus.InProgress, null));
    }

    [Fact]
    public async Task UpdateProgressAsync_PlanNotFrozen_Throws()
    {
        var memberId   = Guid.NewGuid();
        var assignment = new PlanAssignment { Id = Guid.NewGuid(), TeamMemberId = memberId, WeeklyPlanId = Guid.NewGuid() };

        _assignRepo.Setup(r => r.GetByIdForUpdateAsync(assignment.Id)).ReturnsAsync(assignment);
        _planRepo.Setup(p => p.GetStateAsync(assignment.WeeklyPlanId)).ReturnsAsync(WeekState.PlanningOpen);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateProgressAsync(assignment.Id, memberId, 5, AssignmentStatus.InProgress, null));
    }

    [Fact]
    public async Task UpdateProgressAsync_ValidUpdate_SetsFieldsAndAddsHistory()
    {
        var memberId   = Guid.NewGuid();
        var assignment = new PlanAssignment { Id = Guid.NewGuid(), TeamMemberId = memberId, WeeklyPlanId = Guid.NewGuid() };

        _assignRepo.Setup(r => r.GetByIdForUpdateAsync(assignment.Id)).ReturnsAsync(assignment);
        _planRepo.Setup(p => p.GetStateAsync(assignment.WeeklyPlanId)).ReturnsAsync(WeekState.Frozen);

        var result = await _sut.UpdateProgressAsync(assignment.Id, memberId, 7.5m, AssignmentStatus.Done, "All done!");

        Assert.Equal(7.5m, result.HoursCompleted);
        Assert.Equal(AssignmentStatus.Done, result.Status);

        // Verify Update was called on the repository
        _assignRepo.Verify(r => r.Update(It.Is<PlanAssignment>(a => a.Id == assignment.Id)), Times.Once);

        // Verify AddProgressUpdate was called
        _assignRepo.Verify(r => r.AddProgressUpdate(It.Is<ProgressUpdate>(
            p => p.PlanAssignmentId == assignment.Id
              && p.HoursDone == 7.5m
              && p.Status == AssignmentStatus.Done
              && p.Notes == "All done!")), Times.Once);

        // Verify SaveChangesAsync was called
        _uow.Verify(u => u.SaveChangesAsync(default), Times.Once);

        // Result should have the progress update attached
        Assert.Single(result.ProgressUpdates);
        Assert.Equal("All done!", result.ProgressUpdates.First().Notes);
    }
}
