using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Entities;

/// <summary>
/// Represents a weekly planning cycle. Planning happens on Tuesdays for
/// the following 4 working days (Wednesday through Monday).
/// </summary>
public class WeeklyPlan
{
    /// <summary>Unique identifier for the weekly plan.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The Tuesday on which planning occurs.</summary>
    public DateOnly PlanningDate { get; set; }

    /// <summary>Work start date — computed as PlanningDate + 1 day (Wednesday).</summary>
    public DateOnly WorkStartDate { get; set; }

    /// <summary>Work end date — computed as PlanningDate + 6 days (Monday).</summary>
    public DateOnly WorkEndDate { get; set; }

    /// <summary>Current lifecycle state of this planning cycle.</summary>
    public WeekState State { get; set; } = WeekState.Setup;

    /// <summary>Percentage of hours allocated to Client Focused work (0–100).</summary>
    public int ClientFocusedPercent { get; set; }

    /// <summary>Percentage of hours allocated to Tech Debt work (0–100).</summary>
    public int TechDebtPercent { get; set; }

    /// <summary>Percentage of hours allocated to R&D work (0–100).</summary>
    public int RAndDPercent { get; set; }

    /// <summary>When this weekly plan was created.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<WeeklyPlanMember> WeeklyPlanMembers { get; set; } = new List<WeeklyPlanMember>();
    public ICollection<PlanAssignment> PlanAssignments { get; set; } = new List<PlanAssignment>();

    // ── Computed properties ──────────────────────────────────────────────────

    /// <summary>Number of team members selected for this week.</summary>
    public int MemberCount => WeeklyPlanMembers.Count;

    /// <summary>Total plannable hours: selected members × 30 hours each.</summary>
    public int TotalHours => MemberCount * 30;

    /// <summary>Hour budget for Client Focused work.</summary>
    public int ClientFocusedBudgetHours => TotalHours * ClientFocusedPercent / 100;

    /// <summary>Hour budget for Tech Debt work.</summary>
    public int TechDebtBudgetHours => TotalHours * TechDebtPercent / 100;

    /// <summary>Hour budget for R&D work.</summary>
    public int RAndDBudgetHours => TotalHours * RAndDPercent / 100;

    /// <summary>Human-readable display of the work period.</summary>
    public string WorkPeriodDisplay => $"Work period: {WorkStartDate:yyyy-MM-dd} to {WorkEndDate:yyyy-MM-dd}";
}
