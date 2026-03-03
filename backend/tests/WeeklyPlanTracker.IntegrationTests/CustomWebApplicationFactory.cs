using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using WeeklyPlanTracker.Infrastructure.Data;

namespace WeeklyPlanTracker.IntegrationTests;

/// <summary>
/// Custom factory that replaces the SQL Server DB with an in-memory EF database.
/// HTTPS redirection is disabled so tests can communicate over HTTP without needing
/// a real TLS certificate or port.
/// </summary>
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _dbName = "IntegrationTestDb_" + Guid.NewGuid().ToString("N");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        // ── Swap SQL Server EF for in-memory EF ───────────────────────────────
        builder.ConfigureServices(services =>
        {
            var toRemove = services
                .Where(d => d.ServiceType == typeof(DbContextOptions<AppDbContext>))
                .ToList();
            foreach (var d in toRemove) services.Remove(d);

            services.AddDbContext<AppDbContext>(opts =>
                opts.UseInMemoryDatabase(_dbName));
        });

        // Use Development so Swagger middleware is available
        builder.UseEnvironment("Development");

        // Disable HTTPS redirect middleware via URL config —
        // TestServer only binds on http by default, so redirect would fail.
        builder.UseUrls("http://localhost");
    }

    /// <summary>
    /// Expose a CreateClient override that disables auto-redirect so HTTPS
    /// redirect responses are returned to tests as-is (not followed into HTTPS).
    /// </summary>
    public HttpClient CreateTestClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            HandleCookies = false
        });
    }

    protected override IHost CreateHost(IHostBuilder builder)
    {
        var host = base.CreateHost(builder);
        using var scope = host.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Database.EnsureCreated();
        return host;
    }
}
