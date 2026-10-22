using System.Text.Json.Serialization;

namespace Sweat.EdgeService.Models;

public class CloudPassSyncResponse
{
    [JsonPropertyName("server_time_utc")]
    public string ServerTimeUtc { get; set; } = string.Empty;

    [JsonPropertyName("branch_id")]
    public string BranchId { get; set; } = string.Empty;

    [JsonPropertyName("total_passes")]
    public int TotalPasses { get; set; }

    [JsonPropertyName("passes")]
    public List<CloudPassDto> Passes { get; set; } = new();
}

public class CloudPassDto
{
    [JsonPropertyName("pass_id")]
    public string PassId { get; set; } = string.Empty;

    [JsonPropertyName("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [JsonPropertyName("pass_type")]
    public string PassType { get; set; } = "CLASS_BOOKING";

    [JsonPropertyName("valid_from")]
    public string ValidFrom { get; set; } = string.Empty;

    [JsonPropertyName("valid_until")]
    public string ValidUntil { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = "ACTIVE";

    [JsonPropertyName("booking_id")]
    public string? BookingId { get; set; }

    [JsonPropertyName("booking_number")]
    public string? BookingNumber { get; set; }

    [JsonPropertyName("member_id")]
    public string? MemberId { get; set; }

    [JsonPropertyName("member_name")]
    public string? MemberName { get; set; }
}

public class BulkIngestRequest
{
    [JsonPropertyName("branch_id")]
    public string BranchId { get; set; } = string.Empty;

    [JsonPropertyName("events")]
    public List<BulkEventItemDto> Events { get; set; } = new();
}

public class BulkEventItemDto
{
    [JsonPropertyName("event_id")]
    public string EventId { get; set; } = string.Empty;

    [JsonPropertyName("direction")]
    public string Direction { get; set; } = "ENTRY";

    [JsonPropertyName("token_hash")]
    public string TokenHash { get; set; } = string.Empty;

    [JsonPropertyName("scanned_at")]
    public string ScannedAt { get; set; } = string.Empty;

    [JsonPropertyName("device_reference")]
    public string DeviceReference { get; set; } = "TURNSTILE-01";
}

public class BulkIngestResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "SUCCESS";

    [JsonPropertyName("synced_count")]
    public int SyncedCount { get; set; }

    [JsonPropertyName("results")]
    public List<BulkEventResultDto> Results { get; set; } = new();
}

public class BulkEventResultDto
{
    [JsonPropertyName("event_id")]
    public string EventId { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("event_type")]
    public string EventType { get; set; } = string.Empty;

    [JsonPropertyName("reconciliation_status")]
    public string ReconciliationStatus { get; set; } = string.Empty;
}
