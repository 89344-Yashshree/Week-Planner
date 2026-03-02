using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Entities;

/// <summary>Represents a work item in the team's backlog.</summary>
public class BacklogItem
{
    /// <summary>Unique identifier for the backlog item.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Short title describing the work item.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Optional detailed description of the work item.</summary>
    public string? Description { get; set; }

    /// <summary>Category classification: ClientFocused, TechDebt, or RAndD.</summary>
    public BacklogCategory Category { get; set; }

    /// <summary>Estimated hours required to complete this item. Must be > 0.</summary>
    public int EstimatedHours { get; set; }

    /// <summary>Archived items are hidden from the planning picker.</summary>
    public bool IsArchived { get; set; } = false;

    /// <summary>When this backlog item was created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<PlanAssignment> PlanAssignments { get; set; } = new List<PlanAssignment>();
}
