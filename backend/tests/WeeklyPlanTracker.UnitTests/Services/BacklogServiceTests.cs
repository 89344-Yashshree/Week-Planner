using Moq;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.UnitTests.Services;

/// <summary>Unit tests for BacklogService business logic.</summary>
public class BacklogServiceTests
{
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly Mock<IBacklogItemRepository> _repo = new();
    private readonly BacklogService _sut;

    public BacklogServiceTests()
    {
        _uow.Setup(u => u.BacklogItems).Returns(_repo.Object);
        _sut = new BacklogService(_uow.Object);
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task CreateAsync_ValidInput_ReturnsItem()
    {
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var result = await _sut.CreateAsync("My Item", "Desc", BacklogCategory.TechDebt, 5);

        Assert.Equal("My Item", result.Title);
        Assert.Equal(BacklogCategory.TechDebt, result.Category);
        Assert.Equal(5, result.EstimatedHours);
    }

    [Fact]
    public async Task CreateAsync_EmptyTitle_Throws()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateAsync("", null, BacklogCategory.RAndD, 3));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task CreateAsync_ZeroOrNegativeHours_Throws(int hours)
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.CreateAsync("Title", null, BacklogCategory.RAndD, hours));
    }

    // ── ArchiveAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task ArchiveAsync_ExistingItem_SetsIsArchived()
    {
        var item = new BacklogItem { Id = Guid.NewGuid(), IsArchived = false };
        _repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        await _sut.ArchiveAsync(item.Id);

        Assert.True(item.IsArchived);
    }

    [Fact]
    public async Task ArchiveAsync_NotFound_Throws()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((BacklogItem?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.ArchiveAsync(Guid.NewGuid()));
    }

    // ── UpdateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateAsync_ChangesTitle()
    {
        var item = new BacklogItem { Id = Guid.NewGuid(), Title = "Old", EstimatedHours = 3 };
        _repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        var result = await _sut.UpdateAsync(item.Id, "New Title", null, BacklogCategory.RAndD, 8);

        Assert.Equal("New Title", result.Title);
        Assert.Equal(8, result.EstimatedHours);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteAsync_NotFound_Throws()
    {
        _repo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>())).ReturnsAsync((BacklogItem?)null);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.DeleteAsync(Guid.NewGuid()));
    }

    [Fact]
    public async Task DeleteAsync_ExistingItem_CallsRemove()
    {
        var item = new BacklogItem { Id = Guid.NewGuid() };
        _repo.Setup(r => r.GetByIdAsync(item.Id)).ReturnsAsync(item);
        _uow.Setup(u => u.SaveChangesAsync(default)).ReturnsAsync(1);

        await _sut.DeleteAsync(item.Id);

        _repo.Verify(r => r.Remove(item), Times.Once);
    }
}
