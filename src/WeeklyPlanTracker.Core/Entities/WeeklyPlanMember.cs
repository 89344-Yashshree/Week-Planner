namespace WeeklyPlanTracker.Core.Entities;

/// <summary>Join table linking team members to the weekly plans they participate in.</summary>
public class WeeklyPlanMember
{
    public Guid WeeklyPlanId { get; set; }
    public Guid TeamMemberId { get; set; }

    // Navigation properties
    public WeeklyPlan WeeklyPlan { get; set; } = null!;
    public TeamMember TeamMember { get; set; } = null!;
}
