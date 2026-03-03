using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace WeeklyPlanTracker.IntegrationTests;

/// <summary>
/// Integration tests that spin up the full ASP.NET Core pipeline with an in-memory database.
/// Tests cover all major API endpoint groups: Team Members, Backlog Items, Weekly Plans, and Data.
/// </summary>
public class ApiIntegrationTests : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true
    };

    public ApiIntegrationTests(CustomWebApplicationFactory factory)
    {
        _client = factory.CreateTestClient();
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private StringContent Json(object body) =>
        new(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json");

    // ── Data Endpoints ────────────────────────────────────────────────────────

    [Fact]
    public async Task POST_Data_Seed_Returns200()
    {
        var response = await _client.PostAsync("/api/data/seed", new StringContent("", Encoding.UTF8, "application/json"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GET_Data_Export_Returns200WithJson()
    {
        // Seed first so there's data to export
        await _client.PostAsync("/api/data/seed", new StringContent("", Encoding.UTF8, "application/json"));

        var response = await _client.GetAsync("/api/data/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("TeamMembers", content);
    }

    // ── Team Members ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GET_TeamMembers_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/team-members");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task POST_TeamMember_CreatesAndReturns201()
    {
        var response = await _client.PostAsync("/api/team-members",
            Json(new { Name = "Test User" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("Test User", body);
    }

    [Fact]
    public async Task GET_TeamMembers_AfterSeed_ReturnsAtLeastFourMembers()
    {
        await _client.PostAsync("/api/data/seed", new StringContent("", Encoding.UTF8, "application/json"));

        var response = await _client.GetAsync("/api/team-members");
        response.EnsureSuccessStatusCode();

        var members = JsonSerializer.Deserialize<JsonElement[]>(
            await response.Content.ReadAsStringAsync(), _json);

        Assert.NotNull(members);
        Assert.True(members.Length >= 4, $"Expected at least 4 members after seed, but got {members.Length}");
    }

    [Fact]
    public async Task PUT_MakeLead_Returns200()
    {
        // Add two members
        var r1 = await _client.PostAsync("/api/team-members", Json(new { Name = "Alpha" }));
        var r2 = await _client.PostAsync("/api/team-members", Json(new { Name = "Beta" }));
        r1.EnsureSuccessStatusCode();
        r2.EnsureSuccessStatusCode();

        var m2 = JsonSerializer.Deserialize<JsonElement>(
            await r2.Content.ReadAsStringAsync(), _json);
        var id = m2.GetProperty("id").GetString();

        var resp = await _client.PutAsync($"/api/team-members/{id}/make-lead",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.NoContent, resp.StatusCode);
    }

    // ── Backlog Items ─────────────────────────────────────────────────────────

    [Fact]
    public async Task GET_BacklogItems_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/backlog-items");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task POST_BacklogItem_Creates201()
    {
        var response = await _client.PostAsync("/api/backlog-items",
            Json(new { Title = "Test Task", Category = "ClientFocused", EstimatedHours = 5 }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task PUT_ArchiveBacklogItem_Returns200()
    {
        var create = await _client.PostAsync("/api/backlog-items",
            Json(new { Title = "To Archive", Category = "TechDebt", EstimatedHours = 3 }));
        create.EnsureSuccessStatusCode();

        var item = JsonSerializer.Deserialize<JsonElement>(
            await create.Content.ReadAsStringAsync(), _json);
        var id = item.GetProperty("id").GetString();

        var archive = await _client.PutAsync($"/api/backlog-items/{id}/archive",
            new StringContent("", Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.NoContent, archive.StatusCode);
    }

    // ── Weekly Plans ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GET_WeeklyPlans_Current_Returns200OrNoContent()
    {
        var response = await _client.GetAsync("/api/weekly-plans/current");
        // Either 200 (plan exists) or 204/404 (no plan) — both are valid
        Assert.True(
            response.StatusCode == HttpStatusCode.OK ||
            response.StatusCode == HttpStatusCode.NoContent ||
            response.StatusCode == HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task POST_WeeklyPlan_WithTuesdayDate_Returns201()
    {
        // Need at least one member first
        await _client.PostAsync("/api/team-members", Json(new { Name = "Lead Person" }));

        // 2025-03-04 is a Tuesday
        var response = await _client.PostAsync("/api/weekly-plans",
            Json(new { PlanningDate = "2025-03-04" }));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task POST_WeeklyPlan_WithNonTuesdayDate_Returns400()
    {
        // 2025-03-03 is a Monday
        var response = await _client.PostAsync("/api/weekly-plans",
            Json(new { PlanningDate = "2025-03-03" }));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GET_WeeklyPlans_Past_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/weekly-plans/past");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}