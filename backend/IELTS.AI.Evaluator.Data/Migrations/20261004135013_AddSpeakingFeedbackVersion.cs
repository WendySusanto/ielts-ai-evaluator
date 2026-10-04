using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTS.AI.Evaluator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingFeedbackVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Every existing row was marked by the original schema, so it backfills as version 1;
            // new rows always get their version from SpeakingService.CurrentFeedbackVersion.
            migrationBuilder.AddColumn<int>(
                name: "FeedbackVersion",
                table: "SpeakingSessions",
                type: "integer",
                nullable: false,
                defaultValue: 1);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FeedbackVersion",
                table: "SpeakingSessions");
        }
    }
}
