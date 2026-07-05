using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTS.AI.Evaluator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "SpeakingPrompts",
                columns: table => new
                {
                    SpeakingPromptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Topic = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Preview = table.Column<string>(type: "text", nullable: false),
                    Part = table.Column<string>(type: "text", nullable: false),
                    QuestionText = table.Column<string>(type: "text", nullable: false),
                    Cuepoints = table.Column<string>(type: "text", nullable: true),
                    Duration = table.Column<int>(type: "integer", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpeakingPrompts", x => x.SpeakingPromptId);
                });

            migrationBuilder.CreateTable(
                name: "SpeakingEvaluations",
                columns: table => new
                {
                    SpeakingEvaluationId = table.Column<Guid>(type: "uuid", nullable: false),
                    OverallBand = table.Column<decimal>(type: "numeric", nullable: false),
                    RawJson = table.Column<string>(type: "text", nullable: false),
                    Transcript = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    SpeakingPromptId = table.Column<Guid>(type: "uuid", nullable: false),
                    AiModel = table.Column<string>(type: "text", nullable: false),
                    PromptTokenCount = table.Column<int>(type: "integer", nullable: false),
                    CandidatesTokenCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SpeakingEvaluations", x => x.SpeakingEvaluationId);
                    table.ForeignKey(
                        name: "FK_SpeakingEvaluations_SpeakingPrompts_SpeakingPromptId",
                        column: x => x.SpeakingPromptId,
                        principalTable: "SpeakingPrompts",
                        principalColumn: "SpeakingPromptId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_SpeakingEvaluations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_SpeakingEvaluations_SpeakingPromptId",
                table: "SpeakingEvaluations",
                column: "SpeakingPromptId");

            migrationBuilder.CreateIndex(
                name: "IX_SpeakingEvaluations_UserId",
                table: "SpeakingEvaluations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "SpeakingEvaluations");

            migrationBuilder.DropTable(
                name: "SpeakingPrompts");
        }
    }
}
