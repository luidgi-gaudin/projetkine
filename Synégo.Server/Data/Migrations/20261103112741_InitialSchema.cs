using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Synego.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialSchema : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "synego");

            migrationBuilder.CreateTable(
                name: "user_accounts",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirebaseUid = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    DisplayName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: true),
                    PhoneNumber = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Company = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Role = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SignedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_accounts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "appointments",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TypeKey = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    StartsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    EndsAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    InviteeName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    InviteeEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    CalendlyInviteeUri = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    CalendlyEventUri = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    CancelUrl = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    RescheduleUrl = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    ReviewReason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    AdminNotes = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_appointments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_appointments_user_accounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "client_documents",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OwnerId = table.Column<Guid>(type: "uuid", nullable: false),
                    FileName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    StorageKey = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Category = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: false),
                    SharedByStaff = table.Column<bool>(type: "boolean", nullable: false),
                    UploadedById = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_client_documents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_client_documents_user_accounts_OwnerId",
                        column: x => x.OwnerId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "tickets",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: true),
                    ContactName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    ContactEmail = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: false),
                    ContactPhone = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: true),
                    Company = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Subject = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Category = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tickets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_tickets_user_accounts_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "ticket_messages",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TicketId = table.Column<int>(type: "integer", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: true),
                    AuthorName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    FromStaff = table.Column<bool>(type: "boolean", nullable: false),
                    Body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ticket_messages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ticket_messages_tickets_TicketId",
                        column: x => x.TicketId,
                        principalSchema: "synego",
                        principalTable: "tickets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_appointments_CalendlyInviteeUri",
                schema: "synego",
                table: "appointments",
                column: "CalendlyInviteeUri",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_appointments_StartsAt",
                schema: "synego",
                table: "appointments",
                column: "StartsAt");

            migrationBuilder.CreateIndex(
                name: "IX_appointments_UserId",
                schema: "synego",
                table: "appointments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_client_documents_OwnerId_DeletedAt",
                schema: "synego",
                table: "client_documents",
                columns: new[] { "OwnerId", "DeletedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_ticket_messages_TicketId",
                schema: "synego",
                table: "ticket_messages",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_AuthorId",
                schema: "synego",
                table: "tickets",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_tickets_Status",
                schema: "synego",
                table: "tickets",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_user_accounts_Email",
                schema: "synego",
                table: "user_accounts",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_user_accounts_FirebaseUid",
                schema: "synego",
                table: "user_accounts",
                column: "FirebaseUid",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "appointments",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "client_documents",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "ticket_messages",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "tickets",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "user_accounts",
                schema: "synego");
        }
    }
}
