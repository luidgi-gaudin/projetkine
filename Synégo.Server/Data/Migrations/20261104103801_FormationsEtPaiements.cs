using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Synego.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class FormationsEtPaiements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "courses",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    Summary = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Description = table.Column<string>(type: "character varying(8000)", maxLength: 8000, nullable: false),
                    DurationLabel = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    PriceCents = table.Column<long>(type: "bigint", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Published = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_courses", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "community_posts",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    AuthorIsCoach = table.Column<bool>(type: "boolean", nullable: false),
                    Body = table.Column<string>(type: "character varying(5000)", maxLength: 5000, nullable: false),
                    Pinned = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_posts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_community_posts_courses_CourseId",
                        column: x => x.CourseId,
                        principalSchema: "synego",
                        principalTable: "courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_community_posts_user_accounts_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "course_modules",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_course_modules", x => x.Id);
                    table.ForeignKey(
                        name: "FK_course_modules_courses_CourseId",
                        column: x => x.CourseId,
                        principalSchema: "synego",
                        principalTable: "courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "enrollments",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    Source = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    PaymentId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_enrollments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_enrollments_courses_CourseId",
                        column: x => x.CourseId,
                        principalSchema: "synego",
                        principalTable: "courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_enrollments_user_accounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "payments",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Token = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    Kind = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    Status = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: false),
                    CourseId = table.Column<Guid>(type: "uuid", nullable: true),
                    UserId = table.Column<Guid>(type: "uuid", nullable: true),
                    TicketId = table.Column<int>(type: "integer", nullable: true),
                    Email = table.Column<string>(type: "character varying(254)", maxLength: 254, nullable: true),
                    CustomerName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    Label = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    AmountCents = table.Column<long>(type: "bigint", nullable: false),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false),
                    Locale = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    StripeSessionId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    StripePaymentIntentId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    PaymentMethod = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    ReceiptUrl = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedById = table.Column<Guid>(type: "uuid", nullable: true),
                    TermsAcceptedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    PaidAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_payments_courses_CourseId",
                        column: x => x.CourseId,
                        principalSchema: "synego",
                        principalTable: "courses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_payments_user_accounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateTable(
                name: "post_reactions",
                schema: "synego",
                columns: table => new
                {
                    PostId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_post_reactions", x => new { x.PostId, x.UserId });
                    table.ForeignKey(
                        name: "FK_post_reactions_community_posts_PostId",
                        column: x => x.PostId,
                        principalSchema: "synego",
                        principalTable: "community_posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_post_reactions_user_accounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lessons",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ModuleId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(160)", maxLength: 160, nullable: false),
                    Body = table.Column<string>(type: "character varying(20000)", maxLength: 20000, nullable: false),
                    VideoUrl = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    DurationMinutes = table.Column<int>(type: "integer", nullable: true),
                    FreePreview = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lessons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lessons_course_modules_ModuleId",
                        column: x => x.ModuleId,
                        principalSchema: "synego",
                        principalTable: "course_modules",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "community_comments",
                schema: "synego",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    PostId = table.Column<Guid>(type: "uuid", nullable: true),
                    LessonId = table.Column<Guid>(type: "uuid", nullable: true),
                    AuthorId = table.Column<Guid>(type: "uuid", nullable: false),
                    AuthorName = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    AuthorIsCoach = table.Column<bool>(type: "boolean", nullable: false),
                    Body = table.Column<string>(type: "character varying(3000)", maxLength: 3000, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_community_comments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_community_comments_community_posts_PostId",
                        column: x => x.PostId,
                        principalSchema: "synego",
                        principalTable: "community_posts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_community_comments_lessons_LessonId",
                        column: x => x.LessonId,
                        principalSchema: "synego",
                        principalTable: "lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_community_comments_user_accounts_AuthorId",
                        column: x => x.AuthorId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "lesson_progress",
                schema: "synego",
                columns: table => new
                {
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonId = table.Column<Guid>(type: "uuid", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_progress", x => new { x.UserId, x.LessonId });
                    table.ForeignKey(
                        name: "FK_lesson_progress_lessons_LessonId",
                        column: x => x.LessonId,
                        principalSchema: "synego",
                        principalTable: "lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_lesson_progress_user_accounts_UserId",
                        column: x => x.UserId,
                        principalSchema: "synego",
                        principalTable: "user_accounts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_AuthorId",
                schema: "synego",
                table: "community_comments",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_LessonId",
                schema: "synego",
                table: "community_comments",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_community_comments_PostId",
                schema: "synego",
                table: "community_comments",
                column: "PostId");

            migrationBuilder.CreateIndex(
                name: "IX_community_posts_AuthorId",
                schema: "synego",
                table: "community_posts",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_community_posts_CourseId_Pinned_CreatedAt",
                schema: "synego",
                table: "community_posts",
                columns: new[] { "CourseId", "Pinned", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_course_modules_CourseId",
                schema: "synego",
                table: "course_modules",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_courses_Slug",
                schema: "synego",
                table: "courses",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_CourseId_UserId",
                schema: "synego",
                table: "enrollments",
                columns: new[] { "CourseId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_enrollments_UserId",
                schema: "synego",
                table: "enrollments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_progress_LessonId",
                schema: "synego",
                table: "lesson_progress",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_lessons_ModuleId",
                schema: "synego",
                table: "lessons",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_CourseId",
                schema: "synego",
                table: "payments",
                column: "CourseId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_Email",
                schema: "synego",
                table: "payments",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_payments_Status_CreatedAt",
                schema: "synego",
                table: "payments",
                columns: new[] { "Status", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_payments_StripePaymentIntentId",
                schema: "synego",
                table: "payments",
                column: "StripePaymentIntentId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_StripeSessionId",
                schema: "synego",
                table: "payments",
                column: "StripeSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_payments_Token",
                schema: "synego",
                table: "payments",
                column: "Token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_payments_UserId",
                schema: "synego",
                table: "payments",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_post_reactions_UserId",
                schema: "synego",
                table: "post_reactions",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "community_comments",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "enrollments",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "lesson_progress",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "payments",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "post_reactions",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "lessons",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "community_posts",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "course_modules",
                schema: "synego");

            migrationBuilder.DropTable(
                name: "courses",
                schema: "synego");
        }
    }
}
