using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.Core.Entities;

/// <summary>Represents a member of the team who participates in weekly planning.</summary>
public class TeamMember
{
    /// <summary>Unique identifier for the team member.</summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Display name of the team member. Cannot be empty.</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Role of the team member — Lead or Member. Exactly one Lead per team.</summary>
    public MemberRole Role { get; set; } = MemberRole.Member;

    /// <summary>Soft-delete flag. Inactive members are hidden from team management.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>Date and time when this member was added to the team.</summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<WeeklyPlanMember> WeeklyPlanMembers { get; set; } = new List<WeeklyPlanMember>();
    public ICollection<PlanAssignment> PlanAssignments { get; set; } = new List<PlanAssignment>();
}
