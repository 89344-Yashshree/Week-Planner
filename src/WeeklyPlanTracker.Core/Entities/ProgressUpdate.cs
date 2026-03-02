using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Entities;

/// <summary>
/// An immutable history log entry recording a snapshot of an assignment's
/// progress at a point in time. Every time a member saves progress,
/// a new ProgressUpdate is inserted (never updated).
/// </summary>
public class ProgressUpdate
{
    /// <summary>Unique identifier for this update.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The assignment this update belongs to.</summary>
    public Guid PlanAssignmentId { get; set; }

    /// <summary>When this progress snapshot was recorded.</summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    /// <summary>Total hours done at this point in time.</summary>
    public decimal HoursDone { get; set; }

    /// <summary>Assignment status at this point in time.</summary>
    public AssignmentStatus Status { get; set; }

    /// <summary>Optional notes from the member about their progress.</summary>
    public string? Notes { get; set; }

    // Navigation property
    public PlanAssignment PlanAssignment { get; set; } = null!;
}
