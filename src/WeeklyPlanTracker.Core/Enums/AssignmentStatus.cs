namespace WeeklyPlanTracker.Core.Enums;

/// <summary>Tracks the progress status of a plan assignment.</summary>
public enum AssignmentStatus
{
    /// <summary>Work has not started yet.</summary>
    NotStarted,

    /// <summary>Work is actively ongoing.</summary>
    InProgress,

    /// <summary>Work is complete.</summary>
    Done,

    /// <summary>Work is blocked and cannot progress.</summary>
    Blocked
}
