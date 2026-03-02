using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Entities;

/// <summary>
/// Records a team member's commitment to work on a specific backlog item
/// during a given weekly plan. Tracks committed hours and actual progress.
/// </summary>
public class PlanAssignment
{
    /// <summary>Unique identifier for this assignment.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Which weekly plan this assignment belongs to.</summary>
    public Guid WeeklyPlanId { get; set; }

    /// <summary>Which team member this assignment is for.</summary>
    public Guid TeamMemberId { get; set; }

    /// <summary>Which backlog item the member is working on.</summary>
    public Guid BacklogItemId { get; set; }

    /// <summary>Number of hours the member commits to this item. Must be > 0.</summary>
    public int CommittedHours { get; set; }

    /// <summary>Actual hours completed so far. Can exceed CommittedHours (a warning is shown).</summary>
    public decimal HoursCompleted { get; set; } = 0;

    /// <summary>Current progress status of this assignment.</summary>
    public AssignmentStatus Status { get; set; } = AssignmentStatus.NotStarted;

    /// <summary>When this assignment was created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public WeeklyPlan WeeklyPlan { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
    public BacklogItem BacklogItem { get; set; } = null!;
    public ICollection<ProgressUpdate> ProgressUpdates { get; set; } = new List<ProgressUpdate>();
}
