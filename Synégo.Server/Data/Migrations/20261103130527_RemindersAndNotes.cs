using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Synego.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class RemindersAndNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Locale",
                schema: "synego",
                table: "appointments",
                type: "character varying(5)",
                maxLength: 5,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location",
                schema: "synego",
                table: "appointments",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MeetingUrl",
                schema: "synego",
                table: "appointments",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "Reminder24SentAt",
                schema: "synego",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "Reminder48SentAt",
                schema: "synego",
                table: "appointments",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "client_notes",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ClientId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    Pinned = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_client_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_client_notes_user_accounts_ClientId",
                        column: x => x.ClientId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_client_notes_ClientId_Pinned_CreatedAt",
                schema: "synego",
                table: "client_notes",
                columns: new[] { "ClientId", "Pinned", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "client_notes",
                schema: "synego");

            migrationBuilder.DropColumn(
                name: "Locale",
                schema: "synego",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "Location",
                schema: "synego",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "MeetingUrl",
                schema: "synego",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "Reminder24SentAt",
                schema: "synego",
                table: "appointments");

            migrationBuilder.DropColumn(
                name: "Reminder48SentAt",
                schema: "synego",
                table: "appointments");
        }
    }
}
