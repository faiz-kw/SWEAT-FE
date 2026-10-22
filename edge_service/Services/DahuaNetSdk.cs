using System.Runtime.InteropServices;

namespace Sweat.EdgeService.Services;

/// <summary>
/// Dahua NetSDK P/Invoke Interop Declarations.
/// Standard C-bindings for dhnetsdk.dll (x64 Windows).
/// </summary>
public static class DahuaNetSdk
{
    public const string DllName = "dhnetsdk.dll";

    // Access control callback command IDs
    public const int DH_ALARM_ACCESS_CTL_EVENT = 0x310D; // Turnstile / Access Controller Event
    public const int SDK_CTRL_ACCESS_OPEN = 0x01;        // Unlock Relay Command

    // Callbacks
    public delegate void fDisConnectCallBack(IntPtr lLoginID, IntPtr pchDVRIP, int nDVRPort, IntPtr dwUser);
    public delegate bool fAnalyzerDataCallBack(IntPtr lAnalyzerHandle, uint dwAlarmType, IntPtr pAlarmInfo, IntPtr pBuffer, uint dwBufSize, IntPtr dwUser, int nSequence, IntPtr reserved);
    public delegate bool fMessCallBackEx(int lCommand, IntPtr lLoginID, IntPtr pBuf, uint dwBufLen, IntPtr pchDVRIP, int nDVRPort, bool bAlarmAckFlag, int nEventID, IntPtr dwUser);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern bool CLIENT_Init(fDisConnectCallBack cbDisConnect, IntPtr dwUser);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern void CLIENT_Cleanup();

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern IntPtr CLIENT_LoginEx2(
        string pchDVRIP,
        ushort wDVRPort,
        string pchUserName,
        string pchPassword,
        int emSpecCap,
        IntPtr pCapParam,
        ref NET_DEVICEINFO_EX lpDeviceInfo,
        ref int error);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern bool CLIENT_Logout(IntPtr lLoginID);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern bool CLIENT_StartListenEx(IntPtr lLoginID);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern bool CLIENT_StopListen(IntPtr lLoginID);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern void CLIENT_SetDVRMessCallBackEx1(fMessCallBackEx cbMessage, IntPtr dwUser);

    [DllImport(DllName, CallingConvention = CallingConvention.StdCall)]
    public static extern bool CLIENT_ControlDeviceEx(IntPtr lLoginID, uint emType, IntPtr pInBuf, IntPtr pOutBuf, int nWaitTime);

    // Structure Definitions
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct NET_DEVICEINFO_EX
    {
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 48)]
        public byte[] sSerialNumber;
        public int byAlarmInPortNum;
        public int byAlarmOutPortNum;
        public int byDiskNum;
        public int byDVRType;
        public int byChanNum;
        public byte byLimitLoginTime;
        public byte byLeftLogTimes;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 2)]
        public byte[] bReserved;
        public int nSystemType;
        [MarshalAs(UnmanagedType.ByValArray, SizeConst = 512)]
        public byte[] szReserved;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
    public struct NET_ACCESS_CTL_EVENT_INFO
    {
        public uint dwSize;
        public int nDoor;                       // Channel/Door index (0 = Door 1)
        public int emDirection;                 // 0 = Entry, 1 = Exit
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
        public string szCardNo;                 // Fits 22-char Base62 QR Token cleanly
        [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 64)]
        public string szCardName;               // Name stored in card
        public bool bStatus;                    // Event status (true = Granted, false = Denied)
        public int emEventType;                 // Event type enum
        public NET_TIME UTC;                    // Scanned timestamp
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct NET_TIME
    {
        public uint dwYear;
        public uint dwMonth;
        public uint dwDay;
        public uint dwHour;
        public uint dwMinute;
        public uint dwSecond;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct NET_CTRL_ACCESS_RELAY
    {
        public uint dwSize;
        public int nChannel;                    // Door index (0-based)
        public int emOperation;                 // 0 = Close, 1 = Open, 2 = Normal
    }
}
