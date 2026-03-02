using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.Infrastructure.Repositories;

/// <summary>EF Core implementation of ITeamMemberRepository.</summary>
public class TeamMemberRepository : ITeamMemberRepository
{
    private readonly AppDbContext _ctx;
    public TeamMemberRepository(AppDbContext ctx) => _ctx = ctx;

    public async Task<IEnumerable<TeamMember>> GetAllActiveAsync() =>
        await _ctx.TeamMembers.Where(m => m.IsActive).OrderBy(m => m.Name).ToListAsync();

    public Task<TeamMember?> GetByIdAsync(Guid id) =>
        _ctx.TeamMembers.FirstOrDefaultAsync(m => m.Id == id);

    public Task<TeamMember?> GetLeadAsync() =>
        _ctx.TeamMembers.FirstOrDefaultAsync(m => m.IsActive && m.Role == Core.Enums.MemberRole.Lead);

    public Task<bool> ExistsWithNameAsync(string name, Guid? excludeId = null) =>
        _ctx.TeamMembers.AnyAsync(m =>
            m.IsActive &&
            m.Name.ToLower() == name.ToLower().Trim() &&
            (excludeId == null || m.Id != excludeId));

    public Task<int> CountActiveAsync() =>
        _ctx.TeamMembers.CountAsync(m => m.IsActive);

    public void Add(TeamMember member) => _ctx.TeamMembers.Add(member);
    public void Update(TeamMember member) => _ctx.TeamMembers.Update(member);
    public void Remove(TeamMember member) => _ctx.TeamMembers.Remove(member);
}
