import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseWebcamReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isActive: boolean;
  isLoading: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  isSimulated: boolean;
  toggleSimulatedFeed: () => void;
  devices: MediaDeviceInfo[];
  selectedDeviceId: string;
  selectDevice: (deviceId: string) => void;
}

export function useWebcam(): UseWebcamReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simAnimationRef = useRef<number | null>(null);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devList = await navigator.mediaDevices.enumerateDevices();
        const videoDevs = devList.filter((d) => d.kind === 'videoinput');
        setDevices(videoDevs);
        if (videoDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevs[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Could not enumerate devices:', e);
    }
  }, [selectedDeviceId]);

  // Synthetic simulated feed fallback
  const startSimulatedFeed = useCallback(() => {
    if (!simCanvasRef.current) {
      simCanvasRef.current = document.createElement('canvas');
      simCanvasRef.current.width = 640;
      simCanvasRef.current.height = 480;
    }
    const canvas = simCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const renderSynthetic = () => {
      const time = performance.now() * 0.002;

      // Dark cyber gradient background
      const grad = ctx.createLinearGradient(0, 0, 640, 480);
      grad.addColorStop(0, '#070C18');
      grad.addColorStop(1, '#0F1A30');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 640, 480);

      // Fine cyber grid
      ctx.strokeStyle = 'rgba(0, 151, 167, 0.15)';
      ctx.lineWidth = 1;
      for (let x = 0; x < 640; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 480);
        ctx.stroke();
      }
      for (let y = 0; y < 480; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(640, y);
        ctx.stroke();
      }

      // Simulated Subject Face Silhouette
      const cx = 320 + Math.sin(time * 0.8) * 16;
      const cy = 240 + Math.cos(time * 0.6) * 10;

      // Outer head contour
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx, cy, 95, 125, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(30, 58, 138, 0.35)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
      ctx.stroke();

      // Eyes
      const eyeBlink = Math.sin(time * 1.5) > 0.94 ? 1 : 12;
      ctx.fillStyle = '#00E5FF';
      ctx.beginPath();
      ctx.ellipse(cx - 36, cy - 25, 14, eyeBlink, 0, 0, Math.PI * 2);
      ctx.ellipse(cx + 36, cy - 25, 14, eyeBlink, 0, 0, Math.PI * 2);
      ctx.fill();

      // Nose bridge
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx - 6, cy + 15);
      ctx.lineTo(cx + 6, cy + 15);
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mouth
      ctx.beginPath();
      ctx.arc(cx, cy + 45, 24, 0.1 * Math.PI, 0.9 * Math.PI);
      ctx.strokeStyle = 'rgba(0, 151, 167, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      simAnimationRef.current = requestAnimationFrame(renderSynthetic);
    };

    renderSynthetic();

    // Stream capture from canvas
    const simStream = canvas.captureStream(25);
    setStream(simStream);
    if (videoRef.current) {
      videoRef.current.srcObject = simStream;
      videoRef.current.play().catch(() => {});
    }
    setIsSimulated(true);
    setIsActive(true);
    setError(null);
  }, []);

  const stopSimulatedFeed = useCallback(() => {
    if (simAnimationRef.current) {
      cancelAnimationFrame(simAnimationRef.current);
      simAnimationRef.current = null;
    }
    setIsSimulated(false);
  }, []);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    stopSimulatedFeed();
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setIsLoading(false);
  }, [stream, stopSimulatedFeed]);

  // Start real webcam stream
  const startCamera = useCallback(async () => {
    stopCamera();
    setIsLoading(true);
    setError(null);

    const constraints: MediaStreamConstraints = {
      video: {
        width: 640,
        height: 480,
        frameRate: 25,
        ...(selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : {}),
      },
      audio: false,
    };

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('getUserMedia is not supported by your browser environment.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      setIsActive(true);
      setIsSimulated(false);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch((e) => {
          console.warn('Auto-play prevented or paused:', e);
        });
      }

      await updateDeviceList();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to access webcam';
      console.warn('Webcam acquisition warning:', errorMsg);
      setError(errorMsg);
      startSimulatedFeed();
    } finally {
      setIsLoading(false);
    }
  }, [selectedDeviceId, stopCamera, updateDeviceList, startSimulatedFeed]);

  const toggleSimulatedFeed = useCallback(() => {
    if (isSimulated) {
      startCamera();
    } else {
      stopCamera();
      startSimulatedFeed();
    }
  }, [isSimulated, startCamera, stopCamera, startSimulatedFeed]);

  const selectDevice = useCallback((deviceId: string) => {
    setSelectedDeviceId(deviceId);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return {
    videoRef,
    stream,
    isActive,
    isLoading,
    error,
    startCamera,
    stopCamera,
    isSimulated,
    toggleSimulatedFeed,
    devices,
    selectedDeviceId,
    selectDevice,
  };
}
