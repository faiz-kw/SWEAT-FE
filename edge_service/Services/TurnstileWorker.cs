using System.Runtime.InteropServices;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Sweat.EdgeService.Services;

public class TurnstileWorker : BackgroundService
{
    private readonly ILogger<TurnstileWorker> _logger;
    private readonly DatabaseService _db;
    private readonly IConfiguration _config;

    private IntPtr _loginHandle = IntPtr.Zero;
    private DahuaNetSdk.fMessCallBackEx? _alarmCallback;
    private DahuaNetSdk.fDisConnectCallBack? _disconnectCallback;

    private readonly string _ip;
    private readonly ushort _port;
    private readonly string _user;
    private readonly string _pass;
    private readonly int _doorChannel;
    private readonly int _unlockPulseMs;
    private readonly bool _simulateHardware;

    public TurnstileWorker(
        IConfiguration config,
        DatabaseService db,
        ILogger<TurnstileWorker> logger)
    {
        _logger = logger;
        _db = db;
        _config = config;

        _ip = config.GetValue<string>("Turnstile:IpAddress") ?? "192.168.1.108";
        _port = (ushort)config.GetValue<int>("Turnstile:Port", 37777);
        _user = config.GetValue<string>("Turnstile:Username") ?? "admin";
        _pass = config.GetValue<string>("Turnstile:Password") ?? "admin123";
        _doorChannel = config.GetValue<int>("Turnstile:DoorChannel", 0);
        _unlockPulseMs = config.GetValue<int>("Turnstile:UnlockPulseMs", 3000);
        _simulateHardware = config.GetValue<bool>("Turnstile:SimulateHardware", false);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[TURNSTILE] Initializing TurnstileWorker (Target Controller={IP}:{Port}, Simulate={Simulate})...",
            _ip, _port, _simulateHardware);

        if (_simulateHardware)
        {
            await RunHardwareSimulationAsync(stoppingToken);
            return;
        }

        try
        {
            InitializeNetSdk();
            ConnectToTurnstile();
        }
        catch (DllNotFoundException)
        {
            _logger.LogWarning("[TURNSTILE] dhnetsdk.dll not found in runtime directory. Switching to Simulated Hardware mode.");
            await RunHardwareSimulationAsync(stoppingToken);
            return;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[TURNSTILE] Failed to connect to Dahua hardware. Retrying in background...");
        }

        // Keep service alive while listening for events
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(5000, stoppingToken);

            if (_loginHandle == IntPtr.Zero && !_simulateHardware)
            {
                ConnectToTurnstile();
            }
        }

        CleanupNetSdk();
    }

    private void InitializeNetSdk()
    {
        _disconnectCallback = OnDisconnected;
        bool inited = DahuaNetSdk.CLIENT_Init(_disconnectCallback, IntPtr.Zero);
        if (!inited)
        {
            _logger.LogError("[TURNSTILE] NetSDK CLIENT_Init failed.");
            return;
        }

        _alarmCallback = OnTurnstileMessageReceived;
        DahuaNetSdk.CLIENT_SetDVRMessCallBackEx1(_alarmCallback, IntPtr.Zero);
        _logger.LogInformation("[TURNSTILE] NetSDK initialized and alarm callback registered.");
    }

    private void ConnectToTurnstile()
    {
        if (_loginHandle != IntPtr.Zero) return;

        var devInfo = new DahuaNetSdk.NET_DEVICEINFO_EX();
        int err = 0;
        _loginHandle = DahuaNetSdk.CLIENT_LoginEx2(_ip, _port, _user, _pass, 0, IntPtr.Zero, ref devInfo, ref err);

        if (_loginHandle == IntPtr.Zero)
        {
            _logger.LogWarning("[TURNSTILE] Login to {IP}:{Port} failed with NetSDK error code {ErrorCode}", _ip, _port, err);
            return;
        }

        _logger.LogInformation("[TURNSTILE] Successfully logged into Dahua controller {IP} (Handle={Handle})", _ip, _loginHandle);

        bool listening = DahuaNetSdk.CLIENT_StartListenEx(_loginHandle);
        _logger.LogInformation("[TURNSTILE] Real-time event listening started: {Listening}", listening);
    }

    private void OnDisconnected(IntPtr lLoginID, IntPtr pchDVRIP, int nDVRPort, IntPtr dwUser)
    {
        string ip = Marshal.PtrToStringAnsi(pchDVRIP) ?? "Unknown";
        _logger.LogWarning("[TURNSTILE] Disconnected from controller at {IP}:{Port}", ip, nDVRPort);
        _loginHandle = IntPtr.Zero;
    }

    private bool OnTurnstileMessageReceived(
        int lCommand,
        IntPtr lLoginID,
        IntPtr pBuf,
        uint dwBufLen,
        IntPtr pchDVRIP,
        int nDVRPort,
        bool bAlarmAckFlag,
        int nEventID,
        IntPtr dwUser)
    {
        if (lCommand == DahuaNetSdk.DH_ALARM_ACCESS_CTL_EVENT && pBuf != IntPtr.Zero)
        {
            try
            {
                var eventInfo = Marshal.PtrToStructure<DahuaNetSdk.NET_ACCESS_CTL_EVENT_INFO>(pBuf);
                string scannedToken = eventInfo.szCardNo?.Trim() ?? string.Empty;
                string direction = eventInfo.emDirection == 1 ? "EXIT" : "ENTRY";

                if (!string.IsNullOrEmpty(scannedToken))
                {
                    var tokenHashPrefix = DatabaseService.ComputeSha256(scannedToken)[..10];
                    _logger.LogInformation("[TURNSTILE SCAN] TokenHash={TokenHash} Direction={Dir} Door={Door}",
                        tokenHashPrefix, direction, eventInfo.nDoor);

                    ProcessTurnstileScan(scannedToken, direction, $"TURNSTILE-GATE-{eventInfo.nDoor}");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "[TURNSTILE] Error processing access control event callback.");
            }
        }
        return true;
    }

    public bool ProcessTurnstileScan(string rawToken, string direction, string deviceReference)
    {
        var (granted, eventType, reconStatus, memberName, bookingId) =
            _db.AuthorizeAndRecordScan(rawToken, direction, deviceReference);

        if (granted)
        {
            UnlockRelay(_doorChannel);
            _logger.LogInformation(">>> [ACCESS GRANTED] Relay unlocked for {Member} ({Booking})",
                memberName ?? "Member", bookingId ?? "Pass");
        }
        else
        {
            var tokenHashPrefix = DatabaseService.ComputeSha256(rawToken)[..10];
            _logger.LogWarning(">>> [ACCESS DENIED] TokenHash={TokenHash} Status={Status}",
                tokenHashPrefix, reconStatus);
        }

        return granted;
    }

    private void UnlockRelay(int doorChannel)
    {
        if (_loginHandle == IntPtr.Zero) return;

        var relayCtrl = new DahuaNetSdk.NET_CTRL_ACCESS_RELAY
        {
            dwSize = (uint)Marshal.SizeOf<DahuaNetSdk.NET_CTRL_ACCESS_RELAY>(),
            nChannel = doorChannel,
            emOperation = 1 // Open
        };

        IntPtr ptr = Marshal.AllocHGlobal(Marshal.SizeOf(relayCtrl));
        try
        {
            Marshal.StructureToPtr(relayCtrl, ptr, false);
            bool success = DahuaNetSdk.CLIENT_ControlDeviceEx(_loginHandle, DahuaNetSdk.SDK_CTRL_ACCESS_OPEN, ptr, IntPtr.Zero, 1000);
            if (!success)
            {
                _logger.LogWarning("[TURNSTILE] CLIENT_ControlDeviceEx failed to pulse relay on door {Door}", doorChannel);
            }
        }
        finally
        {
            Marshal.FreeHGlobal(ptr);
        }
    }

    private void CleanupNetSdk()
    {
        if (_loginHandle != IntPtr.Zero)
        {
            DahuaNetSdk.CLIENT_StopListen(_loginHandle);
            DahuaNetSdk.CLIENT_Logout(_loginHandle);
            _loginHandle = IntPtr.Zero;
        }
        DahuaNetSdk.CLIENT_Cleanup();
        _logger.LogInformation("[TURNSTILE] NetSDK cleaned up.");
    }

    private async Task RunHardwareSimulationAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("[TURNSTILE SIMULATOR] Simulator active. Ready to process simulated turnstile scans.");
        while (!stoppingToken.IsCancellationRequested)
        {
            await Task.Delay(10000, stoppingToken);
        }
    }
}
