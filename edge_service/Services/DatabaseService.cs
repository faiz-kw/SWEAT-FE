using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Sweat.EdgeService.Models;

namespace Sweat.EdgeService.Services;

public class DatabaseService
{
    private readonly ILogger<DatabaseService> _logger;
    private readonly string _passesDbPath;
    private readonly string _outboxDbPath;
    private readonly object _dbLock = new();

    private readonly int _offlineGraceHours;

    public DatabaseService(IConfiguration config, ILogger<DatabaseService> logger)
    {
        _logger = logger;
        _offlineGraceHours = Math.Max(1, config.GetValue<int>("EdgeConfig:OfflineGraceHours", 12));
        var dataDir = config.GetValue<string>("EdgeConfig:DataDirectory") ?? "data";
        if (!Directory.Exists(dataDir))
        {
            Directory.CreateDirectory(dataDir);
        }
        _passesDbPath = Path.Combine(dataDir, "passes.db");
        _outboxDbPath = Path.Combine(dataDir, "outbox.db");

        InitializeDatabases();
    }

    private string PassesConnStr => $"Data Source={_passesDbPath};Mode=ReadWriteCreate;";
    private string OutboxConnStr => $"Data Source={_outboxDbPath};Mode=ReadWriteCreate;";

    private void InitializeDatabases()
    {
        lock (_dbLock)
        {
            using (var conn = new SqliteConnection(PassesConnStr))
            {
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS passes (
                        token_hash TEXT PRIMARY KEY,
                        pass_id TEXT,
                        pass_type TEXT,
                        valid_from_unix INTEGER,
                        valid_until_unix INTEGER,
                        status TEXT,
                        booking_id TEXT,
                        booking_number TEXT,
                        member_id TEXT,
                        member_name TEXT,
                        last_updated_at INTEGER
                    );
                    CREATE INDEX IF NOT EXISTS idx_passes_status_validity ON passes (status, valid_from_unix, valid_until_unix);

                    CREATE TABLE IF NOT EXISTS edge_sync_state (
                        state_key TEXT PRIMARY KEY,
                        state_value_int INTEGER,
                        updated_at_unix INTEGER
                    );
                ";
                cmd.ExecuteNonQuery();
            }

            using (var conn = new SqliteConnection(OutboxConnStr))
            {
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText = @"
                    CREATE TABLE IF NOT EXISTS outbox_events (
                        event_id TEXT PRIMARY KEY,
                        direction TEXT,
                        token_hash TEXT,
                        scanned_at_utc TEXT,
                        device_reference TEXT,
                        event_type TEXT,
                        reconciliation_status TEXT,
                        booking_id TEXT,
                        member_name TEXT,
                        synced_at_unix INTEGER NULL
                    );
                    CREATE INDEX IF NOT EXISTS idx_outbox_synced ON outbox_events (synced_at_unix);
                ";
                cmd.ExecuteNonQuery();
            }
        }
        _logger.LogInformation("Local SQLite databases initialized successfully (passes.db, outbox.db, & edge_sync_state).");
    }

    public void RecordSuccessfulSync(long syncUnix)
    {
        lock (_dbLock)
        {
            using var conn = new SqliteConnection(PassesConnStr);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO edge_sync_state (state_key, state_value_int, updated_at_unix)
                VALUES ('last_successful_sync_unix', @syncUnix, @syncUnix)
                ON CONFLICT(state_key) DO UPDATE SET
                    state_value_int = excluded.state_value_int,
                    updated_at_unix = excluded.updated_at_unix;
            ";
            cmd.Parameters.AddWithValue("@syncUnix", syncUnix);
            cmd.ExecuteNonQuery();
        }
    }

    public static string ComputeSha256(string raw)
    {
        var bytes = Encoding.UTF8.GetBytes(raw.Trim());
        var hashBytes = SHA256.HashData(bytes);
        var sb = new StringBuilder(64);
        foreach (var b in hashBytes)
        {
            sb.Append(b.ToString("x2"));
        }
        return sb.ToString();
    }

    public void UpsertPasses(IEnumerable<CloudPassDto> cloudPasses)
    {
        lock (_dbLock)
        {
            using var conn = new SqliteConnection(PassesConnStr);
            conn.Open();
            using var tx = conn.BeginTransaction();

            using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = @"
                INSERT INTO passes (
                    token_hash, pass_id, pass_type, valid_from_unix, valid_until_unix,
                    status, booking_id, booking_number, member_id, member_name, last_updated_at
                ) VALUES (
                    @token_hash, @pass_id, @pass_type, @valid_from_unix, @valid_until_unix,
                    @status, @booking_id, @booking_number, @member_id, @member_name, @last_updated_at
                )
                ON CONFLICT(token_hash) DO UPDATE SET
                    status = excluded.status,
                    valid_from_unix = excluded.valid_from_unix,
                    valid_until_unix = excluded.valid_until_unix,
                    booking_id = excluded.booking_id,
                    booking_number = excluded.booking_number,
                    member_name = excluded.member_name,
                    last_updated_at = excluded.last_updated_at
                WHERE passes.status = 'ACTIVE' OR excluded.status != 'ACTIVE';
            ";

            var pHash = cmd.Parameters.Add("@token_hash", SqliteType.Text);
            var pId = cmd.Parameters.Add("@pass_id", SqliteType.Text);
            var pType = cmd.Parameters.Add("@pass_type", SqliteType.Text);
            var pFrom = cmd.Parameters.Add("@valid_from_unix", SqliteType.Integer);
            var pUntil = cmd.Parameters.Add("@valid_until_unix", SqliteType.Integer);
            var pStatus = cmd.Parameters.Add("@status", SqliteType.Text);
            var pBkg = cmd.Parameters.Add("@booking_id", SqliteType.Text);
            var pBkgNum = cmd.Parameters.Add("@booking_number", SqliteType.Text);
            var pMemId = cmd.Parameters.Add("@member_id", SqliteType.Text);
            var pMemName = cmd.Parameters.Add("@member_name", SqliteType.Text);
            var pUpdated = cmd.Parameters.Add("@last_updated_at", SqliteType.Integer);

            var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

            foreach (var p in cloudPasses)
            {
                pHash.Value = p.TokenHash;
                pId.Value = p.PassId;
                pType.Value = p.PassType;
                pFrom.Value = DateTimeOffset.TryParse(p.ValidFrom, out var vf) ? vf.ToUnixTimeSeconds() : nowUnix - 3600;
                pUntil.Value = DateTimeOffset.TryParse(p.ValidUntil, out var vu) ? vu.ToUnixTimeSeconds() : nowUnix + 7200;
                pStatus.Value = p.Status;
                pBkg.Value = (object?)p.BookingId ?? DBNull.Value;
                pBkgNum.Value = (object?)p.BookingNumber ?? DBNull.Value;
                pMemId.Value = (object?)p.MemberId ?? DBNull.Value;
                pMemName.Value = (object?)p.MemberName ?? DBNull.Value;
                pUpdated.Value = nowUnix;

                cmd.ExecuteNonQuery();
            }

            tx.Commit();
        }
    }

    public (bool Granted, string EventType, string ReconciliationStatus, string? MemberName, string? BookingId)
        AuthorizeAndRecordScan(string rawToken, string direction, string deviceReference)
    {
        var tokenHash = ComputeSha256(rawToken);
        var nowUnix = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var nowUtcStr = DateTime.UtcNow.ToString("o");
        var eventId = Guid.NewGuid().ToString();

        bool granted = false;
        string eventType = "DENIED";
        string reconStatus = "UNAUTHORIZED";
        string? memberName = null;
        string? bookingId = null;

        try
        {
            lock (_dbLock)
            {
                using var conn = new SqliteConnection(PassesConnStr);
                conn.Open();

                // Read edge sync state & clock integrity
                long lastSyncUnix = 0;
                long lastKnownClockUnix = 0;
                using (var stateCmd = conn.CreateCommand())
                {
                    stateCmd.CommandText = "SELECT state_key, state_value_int FROM edge_sync_state WHERE state_key IN ('last_successful_sync_unix', 'last_known_clock_unix');";
                    using var sReader = stateCmd.ExecuteReader();
                    while (sReader.Read())
                    {
                        var k = sReader.GetString(0);
                        var v = sReader.GetInt64(1);
                        if (k == "last_successful_sync_unix") lastSyncUnix = v;
                        if (k == "last_known_clock_unix") lastKnownClockUnix = v;
                    }
                }

                bool isEntry = direction.Equals("ENTRY", StringComparison.OrdinalIgnoreCase);

                // Check 1: Clock Rollback Detection (anti-tampering)
                if (isEntry && lastKnownClockUnix > 0 && nowUnix < (lastKnownClockUnix - 60))
                {
                    _logger.LogCritical("[SECURITY AUDIT] Clock rollback detected! Current={Now}, LastCheckpoint={LastKnown}. Denying entry.", nowUnix, lastKnownClockUnix);
                    reconStatus = "CLOCK_ROLLBACK_DETECTED";
                    EnqueueOutboxEvent(eventId, direction, tokenHash, nowUtcStr, deviceReference, "DENIED", reconStatus, null, null);
                    return (false, "DENIED", reconStatus, null, null);
                }

                // Check 2: Offline Grace Cutoff (Default 12 hours)
                // Fails closed on fresh installation before first verified cloud sync or when cutoff exceeded.
                long maxOfflineSeconds = _offlineGraceHours * 3600L;
                if (isEntry && (lastSyncUnix == 0 || (nowUnix - lastSyncUnix > maxOfflineSeconds)))
                {
                    reconStatus = lastSyncUnix == 0 ? "NO_INITIAL_SYNC" : "OFFLINE_CUTOFF_EXCEEDED";
                    _logger.LogWarning("[SECURITY AUDIT] Entry denied: {Status} (LastSync={Sync}, Now={Now})", reconStatus, lastSyncUnix, nowUnix);
                    EnqueueOutboxEvent(eventId, direction, tokenHash, nowUtcStr, deviceReference, "DENIED", reconStatus, null, null);
                    return (false, "DENIED", reconStatus, null, null);
                }

                // Update last known clock checkpoint
                using (var clockCmd = conn.CreateCommand())
                {
                    clockCmd.CommandText = @"
                        INSERT INTO edge_sync_state (state_key, state_value_int, updated_at_unix)
                        VALUES ('last_known_clock_unix', @now, @now)
                        ON CONFLICT(state_key) DO UPDATE SET
                            state_value_int = excluded.state_value_int,
                            updated_at_unix = excluded.updated_at_unix;
                    ";
                    clockCmd.Parameters.AddWithValue("@now", nowUnix);
                    clockCmd.ExecuteNonQuery();
                }

                if (direction.Equals("ENTRY", StringComparison.OrdinalIgnoreCase))
                {
                    // Atomic conditional transition: Only active passes within valid window transition to CONSUMED_ENTERED
                    using var updateCmd = conn.CreateCommand();
                    updateCmd.CommandText = @"
                        UPDATE passes
                        SET status = 'CONSUMED_ENTERED', last_updated_at = @now
                        WHERE token_hash = @hash
                          AND status = 'ACTIVE'
                          AND valid_from_unix <= @now
                          AND valid_until_unix >= @now;
                    ";
                    updateCmd.Parameters.AddWithValue("@hash", tokenHash);
                    updateCmd.Parameters.AddWithValue("@now", nowUnix);
                    int rows = updateCmd.ExecuteNonQuery();

                    if (rows > 0)
                    {
                        granted = true;
                        eventType = "GRANTED";
                        reconStatus = "NORMAL";
                    }

                    // Query pass metadata for audit logging
                    using var readCmd = conn.CreateCommand();
                    readCmd.CommandText = "SELECT member_name, booking_id, status, valid_until_unix FROM passes WHERE token_hash = @hash LIMIT 1;";
                    readCmd.Parameters.AddWithValue("@hash", tokenHash);
                    using var reader = readCmd.ExecuteReader();
                    if (reader.Read())
                    {
                        memberName = reader.IsDBNull(0) ? null : reader.GetString(0);
                        bookingId = reader.IsDBNull(1) ? null : reader.GetString(1);
                        var passStatus = reader.GetString(2);
                        var validUntil = reader.GetInt64(3);

                        if (!granted)
                        {
                            if (passStatus == "CONSUMED_ENTERED" || passStatus == "CONSUMED_EXITED")
                            {
                                reconStatus = "REPLAY_ATTEMPT";
                            }
                            else if (nowUnix > validUntil)
                            {
                                reconStatus = "EXPIRED";
                            }
                        }
                    }
                }
                else
                {
                    // EXIT direction: Normal QR exit scanning
                    // Enforces strict anti-passback: Only passes in CONSUMED_ENTERED can exit.
                    // An ACTIVE pass that has never entered is strictly DENIED at the exit reader.
                    // Note: Class expiry (valid_until) does not block exit for a member who entered.
                    using var updateCmd = conn.CreateCommand();
                    updateCmd.CommandText = @"
                        UPDATE passes
                        SET status = 'CONSUMED_EXITED', last_updated_at = @now
                        WHERE token_hash = @hash
                          AND status = 'CONSUMED_ENTERED';
                    ";
                    updateCmd.Parameters.AddWithValue("@hash", tokenHash);
                    updateCmd.Parameters.AddWithValue("@now", nowUnix);
                    int rows = updateCmd.ExecuteNonQuery();

                    if (rows > 0)
                    {
                        granted = true;
                        eventType = "GRANTED";
                        reconStatus = "NORMAL";
                    }
                    else
                    {
                        // Check pass state in passes.db for audit diagnostics
                        using var checkCmd = conn.CreateCommand();
                        checkCmd.CommandText = "SELECT status, member_name, booking_id FROM passes WHERE token_hash = @hash LIMIT 1;";
                        checkCmd.Parameters.AddWithValue("@hash", tokenHash);
                        using var checkReader = checkCmd.ExecuteReader();
                        if (checkReader.Read())
                        {
                            var existingStatus = checkReader.GetString(0);
                            memberName = checkReader.IsDBNull(1) ? null : checkReader.GetString(1);
                            bookingId = checkReader.IsDBNull(2) ? null : checkReader.GetString(2);

                            granted = false;
                            eventType = "DENIED";

                            if (existingStatus == "ACTIVE")
                            {
                                // Pass was never scanned for entry
                                reconStatus = "NOT_ENTERED";
                            }
                            else if (existingStatus == "CONSUMED_EXITED")
                            {
                                // Pass was already used to exit
                                reconStatus = "ALREADY_EXITED";
                            }
                            else
                            {
                                reconStatus = "INVALID_STATE";
                            }
                        }
                        else
                        {
                            // Completely unknown token scanned at exit reader -> DENY
                            // Software must never open gates for arbitrary unknown barcodes.
                            // Emergency egress is guaranteed separately by independent physical hardware.
                            granted = false;
                            eventType = "DENIED";
                            reconStatus = "UNAUTHORIZED";
                        }
                    }

                    if (memberName == null && rows > 0)
                    {
                        using var readCmd = conn.CreateCommand();
                        readCmd.CommandText = "SELECT member_name, booking_id FROM passes WHERE token_hash = @hash LIMIT 1;";
                        readCmd.Parameters.AddWithValue("@hash", tokenHash);
                        using var reader = readCmd.ExecuteReader();
                        if (reader.Read())
                        {
                            memberName = reader.IsDBNull(0) ? null : reader.GetString(0);
                            bookingId = reader.IsDBNull(1) ? null : reader.GetString(1);
                        }
                    }
                }
            }

            // Durably enqueue in outbox.db
            EnqueueOutboxEvent(eventId, direction, tokenHash, nowUtcStr, deviceReference, eventType, reconStatus, bookingId, memberName);
        }
        catch (Exception ex)
        {
            _logger.LogCritical(ex, "[SECURITY AUDIT] Fatal database/storage error during scan authorization. Failing closed for safety.");
            return (false, "DENIED", "STORAGE_ERROR", null, null);
        }

        _logger.LogInformation("[ACCESS DECISION] TokenHash={TokenHash} Direction={Direction} Granted={Granted} Recon={Recon} Member={Member}",
            tokenHash[..10], direction, granted, reconStatus, memberName ?? "Unknown");

        return (granted, eventType, reconStatus, memberName, bookingId);
    }

    public void EnqueueOutboxEvent(
        string eventId,
        string direction,
        string tokenHash,
        string nowUtcStr,
        string deviceReference,
        string eventType,
        string reconStatus,
        string? bookingId,
        string? memberName)
    {
        lock (_dbLock)
        {
            using var conn = new SqliteConnection(OutboxConnStr);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                INSERT INTO outbox_events (
                    event_id, direction, token_hash, scanned_at_utc,
                    device_reference, event_type, reconciliation_status,
                    booking_id, member_name, synced_at_unix
                ) VALUES (
                    @event_id, @direction, @token_hash, @scanned_at_utc,
                    @device_reference, @event_type, @reconciliation_status,
                    @booking_id, @member_name, NULL
                );
            ";
            cmd.Parameters.AddWithValue("@event_id", eventId);
            cmd.Parameters.AddWithValue("@direction", direction);
            cmd.Parameters.AddWithValue("@token_hash", tokenHash);
            cmd.Parameters.AddWithValue("@scanned_at_utc", nowUtcStr);
            cmd.Parameters.AddWithValue("@device_reference", deviceReference);
            cmd.Parameters.AddWithValue("@event_type", eventType);
            cmd.Parameters.AddWithValue("@reconciliation_status", reconStatus);
            cmd.Parameters.AddWithValue("@booking_id", (object?)bookingId ?? DBNull.Value);
            cmd.Parameters.AddWithValue("@member_name", (object?)memberName ?? DBNull.Value);
            cmd.ExecuteNonQuery();
        }
    }

    public List<AccessEventRecord> GetUnsyncedOutboxEvents(int maxBatchSize = 100)
    {
        var list = new List<AccessEventRecord>();
        lock (_dbLock)
        {
            using var conn = new SqliteConnection(OutboxConnStr);
            conn.Open();
            using var cmd = conn.CreateCommand();
            cmd.CommandText = @"
                SELECT event_id, direction, token_hash, scanned_at_utc, device_reference,
                       event_type, reconciliation_status, booking_id, member_name
                FROM outbox_events
                WHERE synced_at_unix IS NULL
                ORDER BY rowid ASC
                LIMIT @limit;
            ";
            cmd.Parameters.AddWithValue("@limit", maxBatchSize);
            using var reader = cmd.ExecuteReader();
            while (reader.Read())
            {
                list.Add(new AccessEventRecord
                {
                    EventId = reader.GetString(0),
                    Direction = reader.GetString(1),
                    TokenHash = reader.GetString(2),
                    ScannedAtUtc = reader.GetString(3),
                    DeviceReference = reader.GetString(4),
                    EventType = reader.GetString(5),
                    ReconciliationStatus = reader.GetString(6),
                    BookingId = reader.IsDBNull(7) ? null : reader.GetString(7),
                    MemberName = reader.IsDBNull(8) ? null : reader.GetString(8),
                });
            }
        }
        return list;
    }

    public void MarkOutboxEventsSynced(IEnumerable<string> eventIds)
    {
        lock (_dbLock)
        {
            using var conn = new SqliteConnection(OutboxConnStr);
            conn.Open();
            using var tx = conn.BeginTransaction();
            using var cmd = conn.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = "UPDATE outbox_events SET synced_at_unix = @now WHERE event_id = @id;";
            var pNow = cmd.Parameters.Add("@now", SqliteType.Integer);
            var pId = cmd.Parameters.Add("@id", SqliteType.Text);

            pNow.Value = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
            foreach (var id in eventIds)
            {
                pId.Value = id;
                cmd.ExecuteNonQuery();
            }
            tx.Commit();
        }
    }
}
