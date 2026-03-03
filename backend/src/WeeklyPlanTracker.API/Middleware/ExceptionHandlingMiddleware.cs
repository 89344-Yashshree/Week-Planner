using System.Net;
using System.Text.Json;

namespace WeeklyPlanTracker.API.Middleware;

/// <summary>
/// Global exception handler middleware. Catches all unhandled exceptions and
/// returns a consistent JSON error response instead of leaking stack traces.
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (InvalidOperationException ex)
        {
            // Business rule violations — return 400 Bad Request
            _logger.LogWarning(ex, "Business rule violation: {Message}", ex.Message);
            await WriteErrorAsync(context, HttpStatusCode.BadRequest, ex.Message);
        }
        catch (KeyNotFoundException ex)
        {
            _logger.LogWarning(ex, "Resource not found: {Message}", ex.Message);
            await WriteErrorAsync(context, HttpStatusCode.NotFound, ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");
            await WriteErrorAsync(context, HttpStatusCode.InternalServerError,
                "An unexpected error occurred. Please try again later.");
        }
    }

    private static async Task WriteErrorAsync(HttpContext context, HttpStatusCode status, string message)
    {
        context.Response.StatusCode = (int)status;
        context.Response.ContentType = "application/json";

        var body = JsonSerializer.Serialize(new { error = message });
        await context.Response.WriteAsync(body);
    }
}
