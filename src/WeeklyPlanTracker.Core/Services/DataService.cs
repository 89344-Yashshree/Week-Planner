using System.Text.Json;
using WeeklyPlanTracker.Core.Entities;
using WeeklyPlanTracker.Core.Enums;
using WeeklyPlanTracker.Core.Interfaces;

namespace WeeklyPlanTracker.Core.Services;

/// <summary>
/// Handles seed data, JSON export, and full data reset.
/// Export produces a flat JSON envelope containing all tables.
/// Reset is delegated to IDataResetService (implemented in Infrastructure) to avoid an EF dependency in Core.
/// </summary>
public class DataService
{
    private readonly IUnitOfWork _uow;
    private readonly IDataResetService _resetService;

    public DataService(IUnitOfWork uow, IDataResetService resetService)
    {
        _uow = uow;
        _resetService = resetService;
    }

    // ── Seed ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// Clears all existing data and loads the pre-defined sample dataset
    /// (4 team members, 10 backlog items across all 3 categories).
    /// </summary>
    public async Task SeedSampleDataAsync()
    {
        await ResetAllDataAsync();

        // Team members
        var alice = new TeamMember { Name = "Alice Chen",       Role = MemberRole.Lead   };
        var bob   = new TeamMember { Name = "Bob Martinez",     Role = MemberRole.Member };
        var carol = new TeamMember { Name = "Carol Williams",   Role = MemberRole.Member };
        var dave  = new TeamMember { Name = "Dave Kim",         Role = MemberRole.Member };

        _uow.TeamMembers.Add(alice);
        _uow.TeamMembers.Add(bob);
        _uow.TeamMembers.Add(carol);
        _uow.TeamMembers.Add(dave);

        // Backlog items — 4 ClientFocused, 4 TechDebt, 2 RAndD
        var items = new[]
        {
            new BacklogItem { Title = "Client Onboarding Flow",           Category = BacklogCategory.ClientFocused, EstimatedHours = 20, Description = "Build the full onboarding experience for new clients" },
            new BacklogItem { Title = "Fix Billing Page Bugs",            Category = BacklogCategory.ClientFocused, EstimatedHours = 8,  Description = "Fix critical bugs on the billing page" },
            new BacklogItem { Title = "Dashboard Redesign",               Category = BacklogCategory.ClientFocused, EstimatedHours = 15, Description = "Redesign the main analytics dashboard" },
            new BacklogItem { Title = "Support Ticket Integration",       Category = BacklogCategory.ClientFocused, EstimatedHours = 12, Description = "Integrate with the support ticket system" },
            new BacklogItem { Title = "Migrate to PostgreSQL",            Category = BacklogCategory.TechDebt,      EstimatedHours = 20, Description = "Migrate from MySQL to PostgreSQL" },
            new BacklogItem { Title = "Remove Deprecated API Endpoints",  Category = BacklogCategory.TechDebt,      EstimatedHours = 8,  Description = "Clean up old API endpoints" },
            new BacklogItem { Title = "Add Integration Tests",            Category = BacklogCategory.TechDebt,      EstimatedHours = 10, Description = "Add integration tests for core modules" },
            new BacklogItem { Title = "Refactor Auth Module",             Category = BacklogCategory.TechDebt,      EstimatedHours = 12, Description = "Refactor the authentication module" },
            new BacklogItem { Title = "Evaluate LLM for Support",         Category = BacklogCategory.RAndD,         EstimatedHours = 12, Description = "Evaluate LLM capabilities for customer support" },
            new BacklogItem { Title = "Prototype Real-time Notifications", Category = BacklogCategory.RAndD,        EstimatedHours = 6,  Description = "Build a prototype for real-time push notifications" },
        };

        foreach (var item in items) _uow.BacklogItems.Add(item);

        await _uow.SaveChangesAsync();
    }

    // ── Reset ─────────────────────────────────────────────────────────────────

    /// <summary>Deletes all data by delegating to IDataResetService (Infrastructure).</summary>
    public Task ResetAllDataAsync() => _resetService.ResetAllAsync();

    // ── Export ────────────────────────────────────────────────────────────────

    /// <summary>Serialises all application data to a UTF-8 JSON byte array.</summary>
    public async Task<byte[]> ExportAsync()
    {
        var members = await _uow.TeamMembers.GetAllActiveAsync();
        var backlog  = await _uow.BacklogItems.GetAllAsync(includeArchived: true);

        var completed = (await _uow.WeeklyPlans.GetCompletedAsync()).ToList();
        var current   = await _uow.WeeklyPlans.GetCurrentAsync();
        if (current != null) completed.Add(current);

        var allAssignmentsList = new List<PlanAssignment>();
        var allUpdatesList     = new List<ProgressUpdate>();

        foreach (var plan in completed)
        {
            var assignments = (await _uow.PlanAssignments.GetByWeekAsync(plan.Id)).ToList();
            allAssignmentsList.AddRange(assignments);
            allUpdatesList.AddRange(assignments.SelectMany(a => a.ProgressUpdates));
        }

        var envelope = new
        {
            ExportedAt      = DateTime.UtcNow,
            TeamMembers     = members,
            BacklogItems    = backlog,
            WeeklyPlans     = completed,
            PlanAssignments = allAssignmentsList,
            ProgressUpdates = allUpdatesList
        };

        return JsonSerializer.SerializeToUtf8Bytes(
            envelope,
            new JsonSerializerOptions { WriteIndented = true });
    }
}
