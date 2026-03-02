using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;

namespace WeeklyPlanTracker.Core.Services;

/// <summary>
/// Business logic for updating task progress after the plan is frozen.
/// Every save creates an immutable ProgressUpdate history entry.
/// </summary>
public class ProgressService
{
    private readonly IUnitOfWork _uow;

    public ProgressService(IUnitOfWork uow) => _uow = uow;

    /// <summary>Returns all assignments for a member in a given week, including progress history.</summary>
    public Task<IEnumerable<PlanAssignment>> GetMemberAssignmentsAsync(Guid weeklyPlanId, Guid memberId) =>
        _uow.PlanAssignments.GetByMemberAndWeekAsync(memberId, weeklyPlanId);

    /// <summary>Returns all assignments for the whole team in a given week.</summary>
    public Task<IEnumerable<PlanAssignment>> GetTeamAssignmentsAsync(Guid weeklyPlanId) =>
        _uow.PlanAssignments.GetByWeekAsync(weeklyPlanId);

    /// <summary>
    /// Updates progress on an assignment: sets HoursCompleted and Status,
    /// and logs a ProgressUpdate history entry.
    /// Only allowed while the plan is Frozen.
    /// </summary>
    public async Task<PlanAssignment> UpdateProgressAsync(
        Guid assignmentId,
        Guid requestingMemberId,
        decimal hoursDone,
        AssignmentStatus status,
        string? notes)
    {
        if (hoursDone < 0)
            throw new InvalidOperationException("Hours done cannot be negative.");

        var assignment = await _uow.PlanAssignments.GetByIdAsync(assignmentId)
            ?? throw new InvalidOperationException("Assignment not found.");

        // Only allow the owning member to update
        if (assignment.TeamMemberId != requestingMemberId)
            throw new InvalidOperationException("You can only update progress on your own assignments.");

        // Must be in Frozen state
        var plan = await _uow.WeeklyPlans.GetByIdAsync(assignment.WeeklyPlanId)
            ?? throw new InvalidOperationException("Associated weekly plan not found.");

        if (plan.State != WeekState.Frozen)
            throw new InvalidOperationException("Progress updates are only allowed while the plan is frozen.");

        // Update the assignment
        assignment.HoursCompleted = hoursDone;
        assignment.Status = status;
        _uow.PlanAssignments.Update(assignment);

        // Log the history snapshot
        var update = new ProgressUpdate
        {
            PlanAssignmentId = assignmentId,
            HoursDone = hoursDone,
            Status = status,
            Notes = notes
        };

        // ProgressUpdate has no dedicated repository — navigate via PlanAssignment
        assignment.ProgressUpdates.Add(update);

        await _uow.SaveChangesAsync();
        return assignment;
    }
}
