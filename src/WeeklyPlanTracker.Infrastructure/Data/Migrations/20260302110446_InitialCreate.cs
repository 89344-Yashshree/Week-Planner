using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WeeklyPlanTracker.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BacklogItems",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Category = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    EstimatedHours = table.Column<int>(type: "int", nullable: false),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BacklogItems", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TeamMembers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeamMembers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyPlans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlanningDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WorkStartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    WorkEndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    State = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    ClientFocusedPercent = table.Column<int>(type: "int", nullable: false),
                    TechDebtPercent = table.Column<int>(type: "int", nullable: false),
                    RAndDPercent = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyPlans", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PlanAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    WeeklyPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BacklogItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CommittedHours = table.Column<int>(type: "int", nullable: false),
                    HoursCompleted = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PlanAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PlanAssignments_BacklogItems_BacklogItemId",
                        column: x => x.BacklogItemId,
                        principalTable: "BacklogItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanAssignments_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PlanAssignments_WeeklyPlans_WeeklyPlanId",
                        column: x => x.WeeklyPlanId,
                        principalTable: "WeeklyPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WeeklyPlanMembers",
                columns: table => new
                {
                    WeeklyPlanId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TeamMemberId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WeeklyPlanMembers", x => new { x.WeeklyPlanId, x.TeamMemberId });
                    table.ForeignKey(
                        name: "FK_WeeklyPlanMembers_TeamMembers_TeamMemberId",
                        column: x => x.TeamMemberId,
                        principalTable: "TeamMembers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WeeklyPlanMembers_WeeklyPlans_WeeklyPlanId",
                        column: x => x.WeeklyPlanId,
                        principalTable: "WeeklyPlans",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProgressUpdates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PlanAssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    HoursDone = table.Column<decimal>(type: "decimal(10,2)", precision: 10, scale: 2, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProgressUpdates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProgressUpdates_PlanAssignments_PlanAssignmentId",
                        column: x => x.PlanAssignmentId,
                        principalTable: "PlanAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PlanAssignments_BacklogItemId",
                table: "PlanAssignments",
                column: "BacklogItemId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanAssignments_TeamMemberId",
                table: "PlanAssignments",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_PlanAssignments_WeeklyPlanId_TeamMemberId_BacklogItemId",
                table: "PlanAssignments",
                columns: new[] { "WeeklyPlanId", "TeamMemberId", "BacklogItemId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProgressUpdates_PlanAssignmentId",
                table: "ProgressUpdates",
                column: "PlanAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_TeamMembers_Name",
                table: "TeamMembers",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyPlanMembers_TeamMemberId",
                table: "WeeklyPlanMembers",
                column: "TeamMemberId");

            migrationBuilder.CreateIndex(
                name: "IX_WeeklyPlans_State",
                table: "WeeklyPlans",
                column: "State");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProgressUpdates");

            migrationBuilder.DropTable(
                name: "WeeklyPlanMembers");

            migrationBuilder.DropTable(
                name: "PlanAssignments");

            migrationBuilder.DropTable(
                name: "BacklogItems");

            migrationBuilder.DropTable(
                name: "TeamMembers");

            migrationBuilder.DropTable(
                name: "WeeklyPlans");
        }
    }
}
