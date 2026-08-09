using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTS.AI.Evaluator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeechTokenIssue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SpeechTokenIssues",
                columns: table => new
                {
                    SpeechTokenIssueId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpeechTokenIssues", x => x.SpeechTokenIssueId);
                    table.ForeignKey(
                        name: "FK_SpeechTokenIssues_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SpeechTokenIssues_UserId_CreatedAt",
                table: "SpeechTokenIssues",
                columns: new[] { "UserId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SpeechTokenIssues");
        }
    }
}
