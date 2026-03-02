namespace WeeklyPlanTracker.Core.Enums;

/// <summary>Classifies a backlog item into one of three work categories.</summary>
public enum BacklogCategory
{
    /// <summary>Work focused on client-facing features and fixes.</summary>
    ClientFocused,

    /// <summary>Internal improvements to reduce technical debt.</summary>
    TechDebt,

    /// <summary>Research and development exploratory work.</summary>
    RAndD
}
