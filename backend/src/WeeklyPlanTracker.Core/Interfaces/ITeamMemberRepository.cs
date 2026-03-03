using WeeklyPlanTracker.Core.Entities;

namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>Repository contract for team member data access operations.</summary>
public interface ITeamMemberRepository
{
    Task<IEnumerable<TeamMember>> GetAllActiveAsync();
    Task<TeamMember?> GetByIdAsync(Guid id);
    Task<TeamMember?> GetLeadAsync();
    Task<bool> ExistsWithNameAsync(string name, Guid? excludeId = null);
    Task<int> CountActiveAsync();
    void Add(TeamMember member);
    void Update(TeamMember member);
    void Remove(TeamMember member);
}
