using System.Net.Http.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Sweat.EdgeService.Models;

namespace Sweat.EdgeService.Services;

public class CloudSyncWorker : BackgroundService
{
    private readonly ILogger<CloudSyncWorker> _logger;
    private readonly DatabaseService _db;
    private readonly HttpClient _httpClient;
    private readonly string _branchId;
    private readonly string _baseUrl;
    private readonly string _apiKey;
    private readonly int _syncIntervalSeconds;

    public CloudSyncWorker(
        IConfiguration config,
        DatabaseService db,
        ILogger<CloudSyncWorker> logger)
    {
        _logger = logger;
        _db = db;
        _branchId = config.GetValue<string>("EdgeConfig:BranchId") ?? string.Empty;
        _baseUrl = (config.GetValue<string>("EdgeConfig:NeevCloudBaseUrl") ?? "https://fitness.vibecopilot.ai").TrimEnd('/');
        _apiKey = config.GetValue<string>("EdgeConfig:ApiKey") ?? string.Empty;
        _syncIntervalSeconds = Math.Max(10, config.GetValue<int>("EdgeConfig:SyncIntervalSeconds", 30));

        _httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromSeconds(15)
        };
        if (!string.IsNullOrEmpty(_apiKey))
        {
            _httpClient.DefaultRequestHeaders.Add("X-Edge-Api-Key", _apiKey);
        }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[CLOUD SYNC] Starting CloudSyncWorker targeting {BaseUrl} for Branch {BranchId}", _baseUrl, _branchId);

        // Initial immediate sync
        await PerformSyncCycleAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(TimeSpan.FromSeconds(_syncIntervalSeconds), stoppingToken);
                await PerformSyncCycleAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[CLOUD SYNC] Unexpected failure during sync cycle. Continuing offline...");
            }
        }

        _logger.LogInformation("[CLOUD SYNC] CloudSyncWorker stopped.");
    }

    private async Task PerformSyncCycleAsync(CancellationToken stoppingToken)
    {
        // 1. Flush Outbox Events
        await PushOutboxEventsAsync(stoppingToken);

        // 2. Fetch Pass Deltas
        await PullPassDeltasAsync(stoppingToken);
    }

    private async Task PushOutboxEventsAsync(CancellationToken stoppingToken)
    {
        var pendingEvents = _db.GetUnsyncedOutboxEvents(100);
        if (pendingEvents.Count == 0) return;

        _logger.LogInformation("[CLOUD SYNC] Pushing {Count} pending access events to NeevCloud...", pendingEvents.Count);

        var payload = new BulkIngestRequest
        {
            BranchId = _branchId,
            Events = pendingEvents.Select(e => new BulkEventItemDto
            {
                EventId = e.EventId,
                Direction = e.Direction,
                TokenHash = e.TokenHash,
                ScannedAt = e.ScannedAtUtc,
                DeviceReference = e.DeviceReference
            }).ToList()
        };

        try
        {
            var url = $"{_baseUrl}/api/v1/access-control/events/bulk/";
            var response = await _httpClient.PostAsJsonAsync(url, payload, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadFromJsonAsync<BulkIngestResponse>(cancellationToken: stoppingToken);
                _db.MarkOutboxEventsSynced(pendingEvents.Select(e => e.EventId));
                _db.RecordSuccessfulSync(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
                _logger.LogInformation("[CLOUD SYNC] Successfully synced {Count} events to NeevCloud.", result?.SyncedCount ?? pendingEvents.Count);
            }
            else
            {
                var body = await response.Content.ReadAsStringAsync(stoppingToken);
                _logger.LogWarning("[CLOUD SYNC] Ingestion rejected with HTTP {StatusCode}: {Body}", response.StatusCode, body);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("[CLOUD SYNC] Outbox push failed (offline/network unavailable): {Message}", ex.Message);
        }
    }

    private async Task PullPassDeltasAsync(CancellationToken stoppingToken)
    {
        if (string.IsNullOrEmpty(_branchId)) return;

        try
        {
            var url = $"{_baseUrl}/api/v1/access-control/sync/?branch_id={_branchId}";
            var response = await _httpClient.GetAsync(url, stoppingToken);

            if (response.IsSuccessStatusCode)
            {
                var syncData = await response.Content.ReadFromJsonAsync<CloudPassSyncResponse>(cancellationToken: stoppingToken);
                if (syncData != null && syncData.Passes.Count > 0)
                {
                    _db.UpsertPasses(syncData.Passes);
                    _logger.LogInformation("[CLOUD SYNC] Updated local passes cache with {Count} passes from NeevCloud.", syncData.Passes.Count);
                }
                _db.RecordSuccessfulSync(DateTimeOffset.UtcNow.ToUnixTimeSeconds());
            }
            else
            {
                _logger.LogWarning("[CLOUD SYNC] Pass sync endpoint returned HTTP {StatusCode}", response.StatusCode);
            }
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning("[CLOUD SYNC] Pass pull failed (offline/network unavailable): {Message}", ex.Message);
        }
    }
}
