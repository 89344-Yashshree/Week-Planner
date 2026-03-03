using Microsoft.AspNetCore.Mvc;
using Moq;
using WeeklyPlanTracker.API.Controllers;
using WeeklyPlanTracker.API.DTOs;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Controllers;

/// <summary>Unit tests for BacklogItemsController — covers all 6 action methods.</summary>
public class BacklogItemsControllerTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IBacklogItemRepository> _backlogRepo = new();
    private readonly Mock<IWeeklyPlanRepository> _planRepo = new();
    private readonly Mock<IPlanAssignmentRepository> _assignRepo = new();
    private readonly BacklogItemsController _ctrl;

    public BacklogItemsControllerTests()
    {
        _uow.Setup(u => u.BacklogItems).Returns(_backlogRepo.Object);
        _uow.Setup(u => u.WeeklyPlans).Returns(_planRepo.Object);
        _uow.Setup(u => u.PlanAssignments).Returns(_assignRepo.Object);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var backlogSvc = new BacklogService(_uow.Object);
        var planningSvc = new PlanningService(_uow.Object);
        _ctrl = new BacklogItemsController(backlogSvc, planningSvc);
    }

    private static BacklogItem MakeItem(string title = "Task A") =>
        new() { Id = Guid.NewGuid(), Title = title, Category = BacklogCategory.ClientFocused, EstimatedHours = 8, CreatedAt = DateTime.UtcNow };

    // ── GetAll ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetAll_ReturnsOkWithItems()
    {
        // null literals are valid in expression trees; It.IsAny<BacklogCategory?>() causes CS0854
        _backlogRepo.Setup(r => r.GetAllAsync(It.IsAny<bool>(), null, null)).ReturnsAsync(new[] { MakeItem() });
        _planRepo.Setup(r => r.GetCurrentAsync()).ReturnsAsync((WeeklyPlan?)null);

        var result = await _ctrl.GetAll();

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(ok.Value);
    }

    // ── GetById ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_WhenFound_ReturnsOk()
    {
        var item = MakeItem();
        _backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);

        var result = await _ctrl.GetById(item.Id);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<BacklogItemDto>(ok.Value);
    }

    [Fact]
    public async Task GetById_WhenNotFound_ReturnsNotFound()
    {
        _backlogRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((BacklogItem?)null);

        var result = await _ctrl.GetById(Guid.NewGuid());

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_ValidItem_Returns201()
    {
        _backlogRepo.Setup(r => r.Add(It.IsAny<BacklogItem>()));

        var result = await _ctrl.Create(new SaveBacklogItemRequest("New Task", null, BacklogCategory.ClientFocused, 5));

        Assert.IsType<CreatedAtActionResult>(result.Result);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Update_WhenItemExists_ReturnsOk()
    {
        var item = MakeItem("Old Title");
        _backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);

        var result = await _ctrl.Update(item.Id, new SaveBacklogItemRequest("New Title", null, BacklogCategory.ClientFocused, 10));

        Assert.IsType<OkObjectResult>(result.Result);
    }

    // ── Archive ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Archive_WhenItemExists_ReturnsNoContent()
    {
        var item = MakeItem();
        _backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);

        var result = await _ctrl.Archive(item.Id);

        Assert.IsType<NoContentResult>(result);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_WhenItemExists_ReturnsNoContent()
    {
        var item = MakeItem();
        _backlogRepo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);

        var result = await _ctrl.Delete(item.Id);

        Assert.IsType<NoContentResult>(result);
    }
}
