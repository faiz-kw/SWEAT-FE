namespace Sweat.EdgeService.Models;

public class AccessPassRecord
{
    public string PassId { get; set; } = string.Empty;
    public string TokenHash { get; set; } = string.Empty;
    public string PassType { get; set; } = "CLASS_BOOKING";
    public long ValidFromUnix { get; set; }
    public long ValidUntilUnix { get; set; }
    public string Status { get; set; } = "ACTIVE"; // ACTIVE, CONSUMED_ENTERED, CONSUMED_EXITED, REVOKED
    public string? BookingId { get; set; }
    public string? BookingNumber { get; set; }
    public string? MemberId { get; set; }
    public string? MemberName { get; set; }
    public long LastUpdatedAtUnix { get; set; }
}
