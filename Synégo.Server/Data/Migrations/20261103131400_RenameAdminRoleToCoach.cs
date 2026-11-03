using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Synego.Server.Data.Migrations
{
    /// <inheritdoc />
    public partial class RenameAdminRoleToCoach : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Le rôle « Admin » s'appelle désormais « Coach » (vocabulaire du métier).
            migrationBuilder.Sql("UPDATE synego.user_accounts SET \"Role\" = 'Coach' WHERE \"Role\" = 'Admin';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("UPDATE synego.user_accounts SET \"Role\" = 'Admin' WHERE \"Role\" = 'Coach';");
        }
    }
}
