using WeeklyPlanTracker.Core.Enums;

namespace WeeklyPlanTracker.API.DTOs;

// ── Team Member DTOs ────────────────────────────────────────────────────────

/// <summary>Response DTO for a team member.</summary>
public record TeamMemberDto(
    Guid Id,
    string Name,
    string Role,
    bool IsActive,
    DateTime CreatedAt);

/// <summary>Request to add a new team member.</summary>
public record AddTeamMemberRequest(string Name);

/// <summary>Request to update a team member's name.</summary>
public record UpdateTeamMemberRequest(string Name);

// ── Backlog Item DTOs ────────────────────────────────────────────────────────

/// <summary>Response DTO for a backlog item.</summary>
public record BacklogItemDto(
    Guid Id,
    string Title,
    string? Description,
    string Category,
    int EstimatedHours,
    bool IsArchived,
    bool IsInActivePlan,
    DateTime CreatedAt);

/// <summary>Request to create or update a backlog item.</summary>
public record SaveBacklogItemRequest(
    string Title,
    string? Description,
    BacklogCategory Category,
    int EstimatedHours);

// ── Weekly Plan DTOs ─────────────────────────────────────────────────────────

/// <summary>Response DTO for a weekly plan (summary level).</summary>
public record WeeklyPlanDto(
    Guid Id,
    string PlanningDate,
    string WorkStartDate,
    string WorkEndDate,
    string State,
    int ClientFocusedPercent,
    int TechDebtPercent,
    int RAndDPercent,
    int MemberCount,
    int TotalHours,
    int ClientFocusedBudgetHours,
    int TechDebtBudgetHours,
    int RAndDBudgetHours,
    string WorkPeriodDisplay,
    List<TeamMemberDto> SelectedMembers);

/// <summary>Request to configure a weekly plan (members + category %).</summary>
public record ConfigurePlanRequest(
    string PlanningDate,
    List<Guid> MemberIds,
    int ClientFocusedPercent,
    int TechDebtPercent,
    int RAndDPercent);

/// <summary>Request to start a new weekly plan.</summary>
public record StartWeekRequest(string PlanningDate);

// ── Plan Assignment DTOs ──────────────────────────────────────────────────────

/// <summary>Response DTO for a plan assignment.</summary>
public record PlanAssignmentDto(
    Guid Id,
    Guid WeeklyPlanId,
    Guid TeamMemberId,
    string MemberName,
    Guid BacklogItemId,
    string BacklogItemTitle,
    string BacklogItemCategory,
    int CommittedHours,
    decimal HoursCompleted,
    string Status,
    DateTime CreatedAt,
    List<ProgressUpdateDto> ProgressUpdates);

/// <summary>Request to add a backlog item to a member's plan.</summary>
public record AddAssignmentRequest(
    Guid WeeklyPlanId,
    Guid TeamMemberId,
    Guid BacklogItemId,
    int CommittedHours);

// ── Progress DTOs ─────────────────────────────────────────────────────────────

/// <summary>Response DTO for a progress update history entry.</summary>
public record ProgressUpdateDto(
    Guid Id,
    DateTime Timestamp,
    decimal HoursDone,
    string Status,
    string? Notes);

/// <summary>Request to update progress on an assignment.</summary>
public record UpdateProgressRequest(
    Guid RequestingMemberId,
    decimal HoursDone,
    AssignmentStatus Status,
    string? Notes);

// ── Team Progress DTO ─────────────────────────────────────────────────────────

/// <summary>Aggregate team progress summary for the See Team Progress screen.</summary>
public record TeamProgressDto(
    decimal OverallPercent,
    int TotalCommittedHours,
    decimal TotalHoursDone,
    int TasksDone,
    int TasksBlocked,
    List<CategoryProgressDto> ByCategory,
    List<MemberProgressDto> ByMember);

public record CategoryProgressDto(
    string Category,
    int CommittedHours,
    decimal HoursDone);

public record MemberProgressDto(
    Guid MemberId,
    string MemberName,
    int CommittedHours,
    decimal HoursDone,
    List<PlanAssignmentDto> Assignments);
