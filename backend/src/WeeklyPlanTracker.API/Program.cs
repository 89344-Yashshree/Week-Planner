using Microsoft.EntityFrameworkCore;
using WeeklyPlanTracker.API.Middleware;
using WeeklyPlanTracker.Core.Services;
using WeeklyPlanTracker.Infrastructure;
using WeeklyPlanTracker.Infrastructure.Data;

var builder = WebApplication.CreateBuilder(args);

// ── Services ──────────────────────────────────────────────────────────────────

// Infrastructure (EF Core, repositories, UnitOfWork)
builder.Services.AddInfrastructure(builder.Configuration);

// Core business services
builder.Services.AddScoped<TeamService>();
builder.Services.AddScoped<BacklogService>();
builder.Services.AddScoped<PlanningService>();
builder.Services.AddScoped<ProgressService>();
builder.Services.AddScoped<DataService>();

// Health checks for monitoring
builder.Services.AddHealthChecks()
    .AddSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")!);

// Response caching
builder.Services.AddResponseCaching();

// Controllers + JSON options (serialize enums as strings)
builder.Services.AddControllers()
    .AddJsonOptions(opt =>
    {
        opt.JsonSerializerOptions.Converters.Add(
            new System.Text.Json.Serialization.JsonStringEnumConverter());
    });

// Swagger / OpenAPI
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Weekly Plan Tracker API", Version = "v1" });
});

// CORS — allow Angular dev server and production origin
builder.Services.AddCors(opts =>
{
    opts.AddDefaultPolicy(policy => policy
        .WithOrigins(
            "http://localhost:4200",   // Angular dev server
            "https://localhost:4200",
            "https://nice-ocean-00beb6100.6.azurestaticapps.net")  // Azure Static Web App
        .AllowAnyHeader()
        .AllowAnyMethod());
});

var app = builder.Build();

// ── Middleware pipeline ───────────────────────────────────────────────────────

// Global exception handler — must be first
app.UseMiddleware<ExceptionHandlingMiddleware>();

// Swagger available in all environments for verification
app.UseSwagger();
app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Weekly Plan Tracker v1"));

// CORS must come before HTTPS redirect so headers are present on redirect responses
app.UseCors();
app.UseResponseCaching();

// Only apply HTTPS redirect for real deployments (not when using in-memory DB in integration tests)
using (var detectScope = app.Services.CreateScope())
{
    var detectDb = detectScope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (detectDb.Database.IsRelational())
        app.UseHttpsRedirection();
}
app.MapControllers();
app.MapHealthChecks("/health");

// ── Auto-migrate database on startup (with timeout to prevent hanging on Azure) ───
try
{
    using var migrationCts = new CancellationTokenSource(TimeSpan.FromSeconds(30));
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (db.Database.IsRelational())
        await db.Database.MigrateAsync(migrationCts.Token);
    else
        await db.Database.EnsureCreatedAsync(migrationCts.Token);
}
catch (Exception ex)
{
    app.Logger.LogError(ex, "Database migration failed on startup — app will start without migration");
}

await app.RunAsync();

// Expose Program for WebApplicationFactory in integration tests
public partial class Program { }
