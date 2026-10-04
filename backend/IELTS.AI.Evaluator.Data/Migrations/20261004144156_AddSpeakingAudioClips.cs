using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace IELTS.AI.Evaluator.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddSpeakingAudioClips : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AudioClips",
                table: "SpeakingSessions",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AudioClips",
                table: "SpeakingSessions");
        }
    }
}
