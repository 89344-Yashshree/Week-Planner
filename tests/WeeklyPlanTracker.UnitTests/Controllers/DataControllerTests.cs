using Microsoft.AspNetCore.Mvc;
using Moq;
using WeeklyPlanTracker.API.Controllers;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Controllers;

/// <summary>Unit tests for DataController — covers Export, Seed, Reset actions.</summary>
public class DataControllerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<ITeamMemberRepository> _memberRepo = new();
    private readonly Mock<IBacklogItemRepository> _backlogRepo = new();
    private readonly Mock<IWeeklyPlanRepository> _planRepo = new();
    private readonly Mock<IDataResetService> _resetSvc = new();
    private readonly DataController _ctrl;

    public DataControllerTests()
    {
        _uow.Setup(u => u.TeamMembers).Returns(_memberRepo.Object);
        _uow.Setup(u => u.BacklogItems).Returns(_backlogRepo.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_planRepo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var svc = new DataService(_uow.Object, _resetSvc.Object);
        _ctrl = new DataController(svc);
    }

    // ── Export ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Export_ReturnsFileResult()
    {
        _memberRepo.Setup(r => r.GetAllActiveAsync()).ReturnsAsync(Array.Empty<TeamMember>());
        // null literals are valid in expression trees; It.IsAny<BacklogCategory?>() causes CS0854
        _backlogRepo.Setup(r => r.GetAllAsync(It.IsAny<bool>(), null, null)).ReturnsAsync(Array.Empty<BacklogItem>());
        _planRepo.Setup(r => r.GetCompletedAsync()).ReturnsAsync(Array.Empty<WeeklyPlan>());
        _planRepo.Setup(r => r.GetCurrentAsync()).ReturnsAsync((WeeklyPlan?)null);

        var result = await _ctrl.Export();

        var fileResult = Assert.IsType<FileContentResult>(result);
        Assert.Equal("application/json", fileResult.ContentType);
        Assert.True(fileResult.FileContents.Length > 0);
    }

    // ── Seed ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Seed_ReturnsOkWithMessage()
    {
        _resetSvc.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);
        _memberRepo.Setup(r => r.Add(It.IsAny<TeamMember>()));
        _backlogRepo.Setup(r => r.Add(It.IsAny<BacklogItem>()));

        var result = await _ctrl.Seed();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Reset_ReturnsOkWithMessage()
    {
        _resetSvc.Setup(r => r.ResetAllAsync()).Returns(Task.CompletedTask);

        var result = await _ctrl.Reset();

        var ok = Assert.IsType<OkObjectResult>(result);
        Assert.NotNull(ok.Value);
    }
}
