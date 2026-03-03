using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;

namespace WeeklyPlanTracker.Core.Services;

/// <summary>
/// Business logic for managing team members.
/// Enforces the "exactly one Lead" invariant and soft-delete rules.
/// </summary>
public class TeamService
{
    private readonly IUnitOfWork _uow;

    public TeamService(IUnitOfWork uow) => _uow = uow;

    /// <summary>Returns all active team members.</summary>
    public Task<IEnumerable<TeamMember>> GetAllAsync() =>
        _uow.TeamMembers.GetAllActiveAsync();

    /// <summary>Returns a single member by ID, or null if not found.</summary>
    public Task<TeamMember?> GetByIdAsync(Guid id) =>
        _uow.TeamMembers.GetByIdAsync(id);

    /// <summary>
    /// Adds a new team member.
    /// The very first member added is automatically promoted to Lead.
    /// </summary>
    public async Task<TeamMember> AddMemberAsync(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Name cannot be empty.");

        if (await _uow.TeamMembers.ExistsWithNameAsync(name))
            throw new InvalidOperationException($"A member named '{name}' already exists.");

        var count = await _uow.TeamMembers.CountActiveAsync();

        var member = new TeamMember
        {
            Name = name.Trim(),
            // First member added becomes the Lead automatically
            Role = count == 0 ? MemberRole.Lead : MemberRole.Member
        };

        _uow.TeamMembers.Add(member);
        await _uow.SaveChangesAsync();
        return member;
    }

    /// <summary>
    /// Makes the specified member the Team Lead.
    /// Demotes the previous Lead to Member automatically.
    /// </summary>
    public async Task MakeLeadAsync(Guid memberId)
    {
        var newLead = await _uow.TeamMembers.GetByIdAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        if (!newLead.IsActive)
            throw new InvalidOperationException("Cannot make an inactive member the Lead.");

        // Demote current lead
        var currentLead = await _uow.TeamMembers.GetLeadAsync();
        if (currentLead != null && currentLead.Id != memberId)
        {
            currentLead.Role = MemberRole.Member;
            _uow.TeamMembers.Update(currentLead);
        }

        newLead.Role = MemberRole.Lead;
        _uow.TeamMembers.Update(newLead);
        await _uow.SaveChangesAsync();
    }

    /// <summary>
    /// Soft-deletes a team member.
    /// Cannot remove the Lead or the last remaining member.
    /// </summary>
    public async Task RemoveMemberAsync(Guid memberId)
    {
        var member = await _uow.TeamMembers.GetByIdAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        var count = await _uow.TeamMembers.CountActiveAsync();
        if (count <= 1)
            throw new InvalidOperationException("Cannot remove the last remaining team member.");

        if (member.Role == MemberRole.Lead)
            throw new InvalidOperationException("Cannot remove the Team Lead. Reassign the Lead role first.");

        member.IsActive = false;
        _uow.TeamMembers.Update(member);
        await _uow.SaveChangesAsync();
    }

    /// <summary>Updates a team member's display name.</summary>
    public async Task UpdateNameAsync(Guid memberId, string newName)
    {
        if (string.IsNullOrWhiteSpace(newName))
            throw new InvalidOperationException("Name cannot be empty.");

        var member = await _uow.TeamMembers.GetByIdAsync(memberId)
            ?? throw new InvalidOperationException("Member not found.");

        if (await _uow.TeamMembers.ExistsWithNameAsync(newName.Trim(), memberId))
            throw new InvalidOperationException($"A member named '{newName}' already exists.");

        member.Name = newName.Trim();
        _uow.TeamMembers.Update(member);
        await _uow.SaveChangesAsync();
    }
}
