using Microsoft.AspNetCore.Mvc;
using WeeklyPlanTracker.Core.Services;

namespace WeeklyPlanTracker.API.Controllers;

/// <summary>Data management: seed, export, import, reset. Base route: /api/data</summary>
[ApiController]
[Route("api/data")]
public class DataController : ControllerBase
{
    private readonly DataService _dataService;

    public DataController(DataService dataService) => _dataService = dataService;

    // GET /api/data/export
    [HttpGet("export")]
    public async Task<IActionResult> Export()
    {
        var bytes = await _dataService.ExportAsync();
        return File(bytes, "application/json", $"weeklyplanner-backup-{DateTime.UtcNow:yyyyMMddHHmmss}.json");
    }

    // POST /api/data/seed
    [HttpPost("seed")]
    public async Task<IActionResult> Seed()
    {
        await _dataService.SeedSampleDataAsync();
        return Ok(new { message = "Sample data loaded." });
    }

    // DELETE /api/data/reset
    [HttpDelete("reset")]
    public async Task<IActionResult> Reset()
    {
        await _dataService.ResetAllDataAsync();
        return Ok(new { message = "All data has been reset." });
    }
}
