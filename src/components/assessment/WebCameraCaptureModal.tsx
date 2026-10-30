import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Upload,
  Timer,
  Eye,
  Grid,
  Loader2,
  ShieldAlert,
  SwitchCamera,
  SlidersHorizontal,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export interface WebCameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  viewType: 'front' | 'side' | 'general';
  targetDistanceMeters?: number;
  onPhotoCaptured: (file: File, previewUrl: string) => void;
}

export const WebCameraCaptureModal: React.FC<WebCameraCaptureModalProps> = ({
  isOpen,
  onClose,
  title,
  viewType,
  targetDistanceMeters = 2.5,
  onPhotoCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Capture & review states
  const [capturedBlobUrl, setCapturedBlobUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [isCountingDown, setIsCountingDown] = useState<boolean>(false);
  const [countdownValue, setCountdownValue] = useState<number>(3);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [showGuidelines, setShowGuidelines] = useState<boolean>(true);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop errors
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  // Start live webcam stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera access is not supported by your browser or environment. Please use modern HTTPS browser or upload a photo directly.');
      return;
    }

    try {
      let constraints: MediaStreamConstraints;

      if (selectedDeviceId) {
        constraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
          audio: false,
        };
      } else {
        constraints = {
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
          },
          audio: false,
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr: any) {
        // Fallback to basic video constraint if high-res or facingMode fails
        console.warn('Initial camera constraint failed, retrying with basic video constraint:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch((playErr) => {
            console.error('Error auto-playing video stream:', playErr);
          });
          setIsStreaming(true);
        };
      }

      // Enumerate available video devices
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setAvailableDevices(videoInputs);
        if (videoInputs.length > 0 && !selectedDeviceId) {
          const activeTrack = stream.getVideoTracks()[0];
          const currentSettings = activeTrack.getSettings ? activeTrack.getSettings() : null;
          if (currentSettings?.deviceId) {
            setSelectedDeviceId(currentSettings.deviceId);
          }
        }
      } catch (enumErr) {
        console.warn('Failed to enumerate media devices:', enumErr);
      }
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      let errorMsg = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Camera permission was denied. Please click the camera icon in your browser address bar and choose "Allow" for this site.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera device was detected on your computer or device. Please plug in a webcam or upload a file.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'The camera is currently in use by another application or browser tab. Please close any other app using the camera.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      setCameraError(errorMsg);
      setIsStreaming(false);
    }
  }, [facingMode, selectedDeviceId, stopCamera]);

  // Handle modal open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setCapturedBlobUrl(null);
      setCapturedFile(null);
      setIsCountingDown(false);
      startCamera();
    } else {
      stopCamera();
      if (capturedBlobUrl) {
        URL.revokeObjectURL(capturedBlobUrl);
      }
      setCapturedBlobUrl(null);
      setCapturedFile(null);
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

  // Flip camera between front (user) and back (environment)
  const handleFlipCamera = () => {
    setSelectedDeviceId('');
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Switch specific device ID
  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDeviceId(e.target.value);
  };

  // Instant shutter capture from video feed onto off-screen canvas
  const performInstantCapture = useCallback(() => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error('Camera stream is not ready yet. Please wait a second.');
      return;
    }

    // Trigger flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      toast.error('Unable to create canvas context for photo capture.');
      return;
    }

    // Draw frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          toast.error('Failed to capture frame from camera.');
          return;
        }

        const fileName = `${viewType}_assessment_${Date.now()}.jpg`;
        const file = new File([blob], fileName, { type: 'image/jpeg', lastModified: Date.now() });
        const url = URL.createObjectURL(blob);

        setCapturedFile(file);
        setCapturedBlobUrl(url);

        // Pause live camera while reviewing photo
        stopCamera();
      },
      'image/jpeg',
      0.92
    );
  }, [stopCamera, viewType]);

  // Trigger capture with 3-second countdown
  const handleStartCountdownCapture = () => {
    if (isCountingDown) return;
    setIsCountingDown(true);
    setCountdownValue(3);

    let current = 3;
    const timer = setInterval(() => {
      current -= 1;
      if (current > 0) {
        setCountdownValue(current);
      } else {
        clearInterval(timer);
        setIsCountingDown(false);
        performInstantCapture();
      }
    }, 1000);
  };

  // Retake photo: discard captured snapshot and restart live video feed
  const handleRetake = () => {
    if (capturedBlobUrl) {
      URL.revokeObjectURL(capturedBlobUrl);
    }
    setCapturedBlobUrl(null);
    setCapturedFile(null);
    startCamera();
  };

  // Confirm photo: save and pass back to parent
  const handleConfirmPhoto = () => {
    if (capturedFile && capturedBlobUrl) {
      onPhotoCaptured(capturedFile, capturedBlobUrl);
      onClose();
    }
  };

  // File upload fallback
  const handleFallbackFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCapturedFile(file);
      setCapturedBlobUrl(url);
      stopCamera();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          stopCamera();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-background border-border/80 shadow-2xl">
        <DialogHeader className="p-4 pb-2 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
              <Camera className="w-4 h-4 text-primary" />
              <span>{title}</span>
              <Badge variant="outline" className="text-[10px] uppercase font-mono px-2 py-0 border-primary/40 text-primary">
                {viewType === 'front' ? 'Coronal View' : viewType === 'side' ? 'Sagittal View' : 'Live Camera'}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Align member according to the biomechanical framing guide at ~{targetDistanceMeters}m distance.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* MAIN VIEWFINDER VIEWPORT */}
        <div className="relative w-full aspect-4/3 bg-black flex items-center justify-center overflow-hidden select-none">
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              capturedBlobUrl ? 'hidden' : isStreaming ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Captured Review Photo */}
          {capturedBlobUrl && (
            <img
              src={capturedBlobUrl}
              alt="Captured assessment preview"
              className="w-full h-full object-cover"
            />
          )}

          {/* Camera Flash Animation */}
          {flashActive && <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />}

          {/* Camera Loading Spinner */}
          {!capturedBlobUrl && !isStreaming && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 text-white z-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-semibold text-muted-foreground">Requesting web camera access...</p>
            </div>
          )}

          {/* Camera Error / Permission Denied Overlay */}
          {cameraError && !capturedBlobUrl && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-black/95 text-white z-20 space-y-3">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm">
                <h4 className="text-sm font-bold text-rose-300">Camera Access Error</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{cameraError}</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={startCamera} className="text-xs gap-1.5 border-white/20 text-white hover:bg-white/10">
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Retry Camera</span>
                </Button>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Photo File Instead</span>
                </Button>
              </div>
            </div>
          )}

          {/* Countdown Indicator Overlay */}
          {isCountingDown && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 backdrop-blur-xs">
              <div className="w-24 h-24 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center text-5xl font-black shadow-2xl animate-pulse">
                {countdownValue}
              </div>
            </div>
          )}

          {/* BIOMECHANICAL GUIDELINE HUD OVERLAYS (WHEN STREAMING) */}
          {isStreaming && !capturedBlobUrl && showGuidelines && (
            <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-10">
              {/* TOP DISTANCE & HEAD ALIGNMENT */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] text-white font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>TARGET DISTANCE: {targetDistanceMeters} METERS</span>
                </div>
                <div className="bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/20 text-[10px] text-white font-mono">
                  {viewType === 'front' ? 'CORONAL (FRONT)' : viewType === 'side' ? 'SAGITTAL (SIDE)' : 'ORTHOGONAL'}
                </div>
              </div>

              {/* SPECIFIC VIEW GUIDES */}
              {viewType === 'front' && (
                <div className="relative flex-1 flex flex-col justify-between my-2 border border-dashed border-emerald-400/40 rounded-2xl p-3">
                  {/* Head Crown Guide */}
                  <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono border-b border-emerald-400/40 pb-1">
                    <span>▲ HEAD CROWN ALIGNMENT</span>
                    <span>EYE LEVEL</span>
                  </div>

                  {/* Shoulder & Pelvis Level Axis */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 text-[9px] text-white/80 font-mono">
                      <div className="h-px bg-white/40 flex-1 border-t border-dashed" />
                      <span className="bg-black/60 px-2 py-0.5 rounded">SHOULDER LEVEL AXIS</span>
                      <div className="h-px bg-white/40 flex-1 border-t border-dashed" />
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-white/80 font-mono">
                      <div className="h-px bg-emerald-400/50 flex-1" />
                      <span className="bg-black/60 px-2 py-0.5 rounded text-emerald-300">ASIS PELVIS AXIS</span>
                      <div className="h-px bg-emerald-400/50 flex-1" />
                    </div>
                  </div>

                  {/* Feet Base Line */}
                  <div className="flex items-center justify-between text-[10px] text-emerald-300 font-mono border-t border-emerald-400/40 pt-1">
                    <span>▼ FEET HIP-WIDTH APART</span>
                    <span>FLOOR LINE 2.5M</span>
                  </div>
                </div>
              )}

              {viewType === 'side' && (
                <div className="relative flex-1 flex flex-col justify-between my-2 border border-dashed border-sky-400/40 rounded-2xl p-3">
                  {/* Eye Level Gaze */}
                  <div className="flex items-center justify-between text-[10px] text-sky-300 font-mono border-b border-sky-400/40 pb-1">
                    <span>▲ HORIZONTAL GAZE GUIDE</span>
                    <span>SAGITTAL APEX</span>
                  </div>

                  {/* Vertical Plumb Line */}
                  <div className="absolute inset-y-10 left-1/2 -translate-x-1/2 flex flex-col items-center justify-between pointer-events-none">
                    <div className="w-0.5 h-full bg-sky-400/60 border-l border-dashed border-sky-300 flex flex-col justify-center items-center">
                      <span className="bg-black/80 text-sky-300 text-[9px] font-mono px-2 py-0.5 rounded whitespace-nowrap -rotate-90">
                        PLUMB: EAR → SHOULDER → HIP → ANKLE
                      </span>
                    </div>
                  </div>

                  {/* Feet Base Line */}
                  <div className="flex items-center justify-between text-[10px] text-sky-300 font-mono border-t border-sky-400/40 pt-1">
                    <span>▼ ANKLE JOINT CENTERED</span>
                    <span>FLOOR LINE 2.5M</span>
                  </div>
                </div>
              )}

              {viewType === 'general' && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-48 h-48 border border-white/30 rounded-2xl border-dashed" />
                </div>
              )}

              {/* BOTTOM TIPS */}
              <div className="text-center">
                <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[10px] px-3 py-1 rounded-full border border-white/20 font-medium">
                  {viewType === 'front'
                    ? 'Member faces camera with neutral posture, arms relaxed at sides.'
                    : 'Member turns 90° sideways, looking straight forward.'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM CONTROLS BAR */}
        <div className="p-4 bg-muted/30 border-t border-border/60 space-y-3">
          {/* Captured Review Action Bar */}
          {capturedBlobUrl ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetake}
                className="gap-2 text-xs flex-1 border-border/80"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleConfirmPhoto}
                className="gap-2 text-xs flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Use This Photo</span>
              </Button>
            </div>
          ) : (
            /* Live Camera Control Bar */
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {/* Camera Selector / Flip button */}
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {availableDevices.length > 1 ? (
                    <select
                      value={selectedDeviceId}
                      onChange={handleDeviceChange}
                      className="text-xs bg-background border border-input rounded-md px-2 py-1.5 text-foreground max-w-[200px] truncate"
                    >
                      {availableDevices.map((device, idx) => (
                        <option key={device.deviceId || idx} value={device.deviceId}>
                          {device.label || `Camera ${idx + 1}`}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFlipCamera}
                      className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                      title="Flip Camera Mode"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Flip ({facingMode === 'environment' ? 'Rear' : 'Front'})</span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowGuidelines((prev) => !prev)}
                    className={`h-8 px-2 text-xs gap-1.5 ${
                      showGuidelines ? 'text-primary' : 'text-muted-foreground'
                    }`}
                    title="Toggle Guides Overlay"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Guides</span>
                  </Button>
                </div>

                {/* Main Shutter & Timer Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleStartCountdownCapture}
                    disabled={!isStreaming || isCountingDown}
                    className="h-9 px-3 text-xs gap-1.5 border-border/80"
                    title="3-Second Timer Capture"
                  >
                    <Timer className="w-3.5 h-3.5 text-amber-500" />
                    <span>3s Timer</span>
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={performInstantCapture}
                    disabled={!isStreaming || isCountingDown}
                    className="h-9 px-4 text-xs gap-2 font-bold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Photo</span>
                  </Button>
                </div>

                {/* Upload from file button */}
                <div className="flex items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                    title="Upload image from computer/device"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Upload File</span>
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Hidden file input for fallback upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFallbackFileUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
