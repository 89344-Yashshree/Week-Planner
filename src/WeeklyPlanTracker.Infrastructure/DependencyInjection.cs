using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WeeklyPlanTracker.Core.Interfaces;
using WeeklyPlanTracker.Infrastructure.Data;
using WeeklyPlanTracker.Infrastructure.Repositories;
using WeeklyPlanTracker.Infrastructure.Services;

namespace WeeklyPlanTracker.Infrastructure;

/// <summary>
/// Extension method to register all Infrastructure-layer services with the DI container.
/// Call this from Program.cs: services.AddInfrastructure(configuration);
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Register EF Core with SQL Server
        services.AddDbContext<AppDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"),
                sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.FullName)));

        // Register repositories
        services.AddScoped<ITeamMemberRepository, TeamMemberRepository>();
        services.AddScoped<IBacklogItemRepository, BacklogItemRepository>();
        services.AddScoped<IWeeklyPlanRepository, WeeklyPlanRepository>();
        services.AddScoped<IPlanAssignmentRepository, PlanAssignmentRepository>();

        // Register Unit of Work
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Register data reset service (needs EF context — lives in Infrastructure)
        services.AddScoped<IDataResetService, DataResetService>();

        return services;
    }
}
