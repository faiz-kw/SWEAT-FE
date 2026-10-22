namespace Sweat.EdgeService.Models;

public class AccessEventRecord
{
    public string EventId { get; set; } = Guid.NewGuid().ToString();
    public string Direction { get; set; } = "ENTRY"; // ENTRY, EXIT
    public string TokenHash { get; set; } = string.Empty;
    public string ScannedAtUtc { get; set; } = DateTime.UtcNow.ToString("o");
    public string DeviceReference { get; set; } = "TURNSTILE-GATE-01";
    public string EventType { get; set; } = "GRANTED"; // GRANTED, DENIED
    public string ReconciliationStatus { get; set; } = "NORMAL"; // NORMAL, OFFLINE_OVERRIDE, REPLAY_ATTEMPT, UNAUTHORIZED, EXPIRED
    public string? BookingId { get; set; }
    public string? MemberName { get; set; }
    public long? SyncedAtUnix { get; set; }
}
