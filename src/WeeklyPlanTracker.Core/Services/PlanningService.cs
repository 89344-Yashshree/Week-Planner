using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;

namespace WeeklyPlanTracker.Core.Services;

/// <summary>
/// Core business logic for the weekly planning lifecycle.
/// Handles state transitions, hour budget calculations, assignment management,
/// and all freeze validation rules prescribed in the PRD.
/// </summary>
public class PlanningService
{
    private readonly IUnitOfWork _uow;

    public PlanningService(IUnitOfWork uow) => _uow = uow;

    // ── Queries ──────────────────────────────────────────────────────────────

    /// <summary>Returns the current active weekly plan, or null if none.</summary>
    public Task<WeeklyPlan?> GetCurrentPlanAsync() =>
        _uow.WeeklyPlans.GetCurrentAsync();

    /// <summary>Returns a plan by ID.</summary>
    public Task<WeeklyPlan?> GetByIdAsync(Guid id) =>
        _uow.WeeklyPlans.GetByIdAsync(id);

    /// <summary>Returns all completed past weeks.</summary>
    public Task<IEnumerable<WeeklyPlan>> GetPastWeeksAsync() =>
        _uow.WeeklyPlans.GetCompletedAsync();

    /// <summary>Returns all assignments for a given member in the active week.</summary>
    public Task<IEnumerable<PlanAssignment>> GetMemberAssignmentsAsync(Guid weeklyPlanId, Guid teamMemberId) =>
        _uow.PlanAssignments.GetByMemberAndWeekAsync(teamMemberId, weeklyPlanId);

    // ── State Transitions ─────────────────────────────────────────────────────

    /// <summary>
    /// Creates a new weekly planning cycle in the Setup state.
    /// Only one active plan can exist at a time.
    /// </summary>
    public async Task<WeeklyPlan> StartNewWeekAsync(DateOnly planningDate)
    {
        if (planningDate.DayOfWeek != DayOfWeek.Tuesday)
            throw new InvalidOperationException("Planning date must be a Tuesday.");

        if (await _uow.WeeklyPlans.HasActivePlanAsync())
            throw new InvalidOperationException("An active planning cycle already exists. Cancel or complete it first.");

        var plan = new WeeklyPlan
        {
            PlanningDate = planningDate,
            WorkStartDate = planningDate.AddDays(1),  // Wednesday
            WorkEndDate = planningDate.AddDays(6),    // Monday
            State = WeekState.Setup
        };

        _uow.WeeklyPlans.Add(plan);
        await _uow.SaveChangesAsync();
        return plan;
    }

    /// <summary>
    /// Configures the Setup-state plan: selects members and sets category percentages.
    /// Validates members exist and percentages sum to 100.
    /// </summary>
    public async Task<WeeklyPlan> ConfigurePlanAsync(
        Guid planId,
        IEnumerable<Guid> memberIds,
        int clientPercent,
        int techDebtPercent,
        int rAndDPercent)
    {
        var plan = await GetPlanOrThrowAsync(planId);
        EnsureState(plan, WeekState.Setup);

        var members = memberIds.ToList();
        if (!members.Any())
            throw new InvalidOperationException("At least one team member must be selected.");

        if (clientPercent + techDebtPercent + rAndDPercent != 100)
            throw new InvalidOperationException("Category percentages must total exactly 100%.");

        if (clientPercent < 0 || techDebtPercent < 0 || rAndDPercent < 0)
            throw new InvalidOperationException("Percentages cannot be negative.");

        // Validate all member IDs exist
        foreach (var id in members)
        {
            var member = await _uow.TeamMembers.GetByIdAsync(id)
                ?? throw new InvalidOperationException($"Team member {id} not found.");
            if (!member.IsActive)
                throw new InvalidOperationException($"Team member '{member.Name}' is not active.");
        }

        // Replace member selection
        plan.WeeklyPlanMembers.Clear();
        foreach (var id in members)
        {
            plan.WeeklyPlanMembers.Add(new WeeklyPlanMember
            {
                WeeklyPlanId = planId,
                TeamMemberId = id
            });
        }

        plan.ClientFocusedPercent = clientPercent;
        plan.TechDebtPercent = techDebtPercent;
        plan.RAndDPercent = rAndDPercent;

        _uow.WeeklyPlans.Update(plan);
        await _uow.SaveChangesAsync();
        return plan;
    }

    /// <summary>
    /// Transitions the plan from Setup → PlanningOpen.
    /// Validates that at least one member is selected and percentages total 100.
    /// </summary>
    public async Task<WeeklyPlan> OpenPlanningAsync(Guid planId)
    {
        var plan = await GetPlanOrThrowAsync(planId);
        EnsureState(plan, WeekState.Setup);

        if (!plan.WeeklyPlanMembers.Any())
            throw new InvalidOperationException("Select at least one team member before opening planning.");

        if (plan.ClientFocusedPercent + plan.TechDebtPercent + plan.RAndDPercent != 100)
            throw new InvalidOperationException("Category percentages must total exactly 100% before opening planning.");

        plan.State = WeekState.PlanningOpen;
        _uow.WeeklyPlans.Update(plan);
        await _uow.SaveChangesAsync();
        return plan;
    }

    /// <summary>
    /// Adds a backlog item assignment for a team member during the PlanningOpen state.
    /// Validates personal hour budget and category budget constraints.
    /// </summary>
    public async Task<PlanAssignment> AddAssignmentAsync(
        Guid planId,
        Guid memberId,
        Guid backlogItemId,
        int committedHours)
    {
        var plan = await GetPlanOrThrowAsync(planId);
        EnsureState(plan, WeekState.PlanningOpen);

        if (committedHours <= 0)
            throw new InvalidOperationException("Committed hours must be greater than 0.");

        // Verify member is selected for this week
        if (!plan.WeeklyPlanMembers.Any(m => m.TeamMemberId == memberId))
            throw new InvalidOperationException("This member is not selected for the current week.");

        // Prevent duplicate assignment of the same item
        var existing = await _uow.PlanAssignments.GetByMemberItemAndWeekAsync(memberId, backlogItemId, planId);
        if (existing != null)
            throw new InvalidOperationException("You have already added this backlog item to your plan.");

        var backlogItem = await _uow.BacklogItems.GetByIdAsync(backlogItemId)
            ?? throw new InvalidOperationException("Backlog item not found.");

        if (backlogItem.IsArchived)
            throw new InvalidOperationException("Cannot assign an archived backlog item.");

        // Validate personal hour budget: 30h per member
        var alreadyCommitted = await _uow.PlanAssignments.GetTotalCommittedHoursAsync(memberId, planId);
        if (alreadyCommitted + committedHours > 30)
            throw new InvalidOperationException(
                $"Adding {committedHours}h would exceed your 30-hour budget. You have {30 - alreadyCommitted}h remaining.");

        // Validate category budget
        var categoryBudget = GetCategoryBudget(plan, backlogItem.Category);
        var allAssignments = await _uow.PlanAssignments.GetByWeekAsync(planId);
        var categoryUsed = allAssignments
            .Where(a => a.BacklogItem.Category == backlogItem.Category)
            .Sum(a => a.CommittedHours);

        if (categoryUsed + committedHours > categoryBudget)
            throw new InvalidOperationException(
                $"Adding {committedHours}h would exceed the {backlogItem.Category} budget of {categoryBudget}h. {categoryBudget - categoryUsed}h remaining.");

        var assignment = new PlanAssignment
        {
            WeeklyPlanId = planId,
            TeamMemberId = memberId,
            BacklogItemId = backlogItemId,
            CommittedHours = committedHours
        };

        _uow.PlanAssignments.Add(assignment);
        await _uow.SaveChangesAsync();
        return assignment;
    }

    /// <summary>Removes a backlog item from a member's plan during PlanningOpen.</summary>
    public async Task RemoveAssignmentAsync(Guid assignmentId, Guid requestingMemberId)
    {
        var assignment = await _uow.PlanAssignments.GetByIdAsync(assignmentId)
            ?? throw new InvalidOperationException("Assignment not found.");

        var plan = await GetPlanOrThrowAsync(assignment.WeeklyPlanId);
        EnsureState(plan, WeekState.PlanningOpen);

        if (assignment.TeamMemberId != requestingMemberId)
            throw new InvalidOperationException("You can only remove your own assignments.");

        _uow.PlanAssignments.Remove(assignment);
        await _uow.SaveChangesAsync();
    }

    /// <summary>
    /// Freezes the plan, transitioning from PlanningOpen → Frozen.
    /// Validates all freeze rules:
    ///   1. Every selected member has committed exactly 30 hours.
    ///   2. Total committed hours for each category exactly matches its budget.
    /// </summary>
    public async Task<WeeklyPlan> FreezePlanAsync(Guid planId)
    {
        var plan = await GetPlanOrThrowAsync(planId);
        EnsureState(plan, WeekState.PlanningOpen);

        var errors = await ValidateFreezeAsync(plan);
        if (errors.Any())
            throw new InvalidOperationException(string.Join("; ", errors));

        plan.State = WeekState.Frozen;
        _uow.WeeklyPlans.Update(plan);
        await _uow.SaveChangesAsync();
        return plan;
    }

    /// <summary>Returns a list of freeze validation issues, empty if the plan can be frozen.</summary>
    public async Task<List<string>> ValidateFreezeAsync(WeeklyPlan plan)
    {
        var errors = new List<string>();
        var allAssignments = (await _uow.PlanAssignments.GetByWeekAsync(plan.Id)).ToList();

        // Rule 1: Every selected member must have exactly 30 committed hours
        foreach (var membership in plan.WeeklyPlanMembers)
        {
            var memberHours = allAssignments
                .Where(a => a.TeamMemberId == membership.TeamMemberId)
                .Sum(a => a.CommittedHours);

            if (memberHours != 30)
            {
                var member = await _uow.TeamMembers.GetByIdAsync(membership.TeamMemberId);
                var name = member?.Name ?? membership.TeamMemberId.ToString();
                errors.Add($"{name} has {memberHours}h planned (needs {30 - memberHours} more).");
            }
        }

        // Rules 2-4: Each category's total committed hours must match its budget
        var categories = new[]
        {
            (BacklogCategory.ClientFocused, plan.ClientFocusedBudgetHours, "Client Focused"),
            (BacklogCategory.TechDebt,      plan.TechDebtBudgetHours,      "Tech Debt"),
            (BacklogCategory.RAndD,         plan.RAndDBudgetHours,          "R&D")
        };

        foreach (var (cat, budget, label) in categories)
        {
            var planned = allAssignments
                .Where(a => a.BacklogItem != null && a.BacklogItem.Category == cat)
                .Sum(a => a.CommittedHours);

            if (planned != budget)
                errors.Add($"{label} has {planned}h planned but budget is {budget}h.");
        }

        return errors;
    }

    /// <summary>Marks the week as Completed, archiving it to Past Weeks.</summary>
    public async Task<WeeklyPlan> CompleteWeekAsync(Guid planId)
    {
        var plan = await GetPlanOrThrowAsync(planId);
        EnsureState(plan, WeekState.Frozen);

        plan.State = WeekState.Completed;
        _uow.WeeklyPlans.Update(plan);
        await _uow.SaveChangesAsync();
        return plan;
    }

    /// <summary>Cancels an in-progress planning cycle (Setup or PlanningOpen), removing it entirely.</summary>
    public async Task CancelWeekAsync(Guid planId)
    {
        var plan = await GetPlanOrThrowAsync(planId);

        if (plan.State != WeekState.Setup && plan.State != WeekState.PlanningOpen)
            throw new InvalidOperationException("Can only cancel a plan in Setup or PlanningOpen state.");

        _uow.WeeklyPlans.Remove(plan);
        await _uow.SaveChangesAsync();
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<WeeklyPlan> GetPlanOrThrowAsync(Guid planId) =>
        await _uow.WeeklyPlans.GetByIdAsync(planId)
            ?? throw new InvalidOperationException("Weekly plan not found.");

    private static void EnsureState(WeeklyPlan plan, WeekState required)
    {
        if (plan.State != required)
            throw new InvalidOperationException(
                $"This action requires the plan to be in '{required}' state, but it is currently '{plan.State}'.");
    }

    private static int GetCategoryBudget(WeeklyPlan plan, BacklogCategory category) => category switch
    {
        BacklogCategory.ClientFocused => plan.ClientFocusedBudgetHours,
        BacklogCategory.TechDebt      => plan.TechDebtBudgetHours,
        BacklogCategory.RAndD         => plan.RAndDBudgetHours,
        _ => 0
    };
}
