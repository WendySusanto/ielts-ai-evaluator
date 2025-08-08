using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTS.AI.Evaluator.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Email = table.Column<string>(type: "text", nullable: false),
                    AuthProvider = table.Column<int>(type: "integer", nullable: false),
                    Plan = table.Column<string>(type: "text", nullable: false),
                    WritingQuotaUsed = table.Column<int>(type: "integer", nullable: false),
                    SpeakingQuotaUsed = table.Column<int>(type: "integer", nullable: false),
                    IELTSTargetType = table.Column<string>(type: "text", nullable: false),
                    IELTSTargetScore = table.Column<decimal>(type: "numeric", nullable: false),
                    TargetTestDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.UserId);
                });

            migrationBuilder.CreateTable(
                name: "WritingPrompts",
                columns: table => new
                {
                    WritingPromptId = table.Column<Guid>(type: "uuid", nullable: false),
                    Topic = table.Column<string>(type: "text", nullable: false),
                    Description = table.Column<string>(type: "text", nullable: false),
                    Preview = table.Column<string>(type: "text", nullable: false),
                    QuestionType = table.Column<string>(type: "text", nullable: false),
                    QuestionText = table.Column<string>(type: "text", nullable: false),
                    Duration = table.Column<int>(type: "integer", nullable: false),
                    MinimumWords = table.Column<int>(type: "integer", nullable: false),
                    TaskType = table.Column<string>(type: "text", nullable: false),
                    Level = table.Column<string>(type: "text", nullable: false),
                    ImageUrl = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WritingPrompts", x => x.WritingPromptId);
                });

            migrationBuilder.CreateTable(
                name: "EssayEvaluations",
                columns: table => new
                {
                    EssayEvaluationId = table.Column<Guid>(type: "uuid", nullable: false),
                    OverallBand = table.Column<decimal>(type: "numeric", nullable: false),
                    RawJson = table.Column<string>(type: "text", nullable: false),
                    UserAnswer = table.Column<string>(type: "text", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    WritingPromptId = table.Column<Guid>(type: "uuid", nullable: false),
                    AiModel = table.Column<string>(type: "text", nullable: false),
                    PromptTokenCount = table.Column<int>(type: "integer", nullable: false),
                    CandidatesTokenCount = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "NOW()"),
                    IsDeleted = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_EssayEvaluations", x => x.EssayEvaluationId);
                    table.ForeignKey(
                        name: "FK_EssayEvaluations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_EssayEvaluations_WritingPrompts_WritingPromptId",
                        column: x => x.WritingPromptId,
                        principalTable: "WritingPrompts",
                        principalColumn: "WritingPromptId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_EssayEvaluations_UserId",
                table: "EssayEvaluations",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_EssayEvaluations_WritingPromptId",
                table: "EssayEvaluations",
                column: "WritingPromptId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "EssayEvaluations");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "WritingPrompts");
        }
    }
}
