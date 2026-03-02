namespace WeeklyPlanTracker.Core.Interfaces;

/// <summary>
/// Abstraction over database reset / bulk-delete operations.
/// Implemented in the Infrastructure layer to keep Core free of EF dependencies.
/// </summary>
public interface IDataResetService
{
    /// <summary>Removes all rows from every table in dependency order.</summary>
    Task ResetAllAsync();
}
