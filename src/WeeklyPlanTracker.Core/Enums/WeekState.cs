namespace WeeklyPlanTracker.Core.Enums;

/// <summary>Represents the lifecycle state of a weekly planning cycle.</summary>
public enum WeekState
{
    /// <summary>Lead is configuring the week (members, date, category %).</summary>
    Setup,

    /// <summary>Members are actively picking backlog items and committing hours.</summary>
    PlanningOpen,

    /// <summary>Plan is locked — only progress updates are allowed.</summary>
    Frozen,

    /// <summary>Week is complete and archived to Past Weeks.</summary>
    Completed
}
