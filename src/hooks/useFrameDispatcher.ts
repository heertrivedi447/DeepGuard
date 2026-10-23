import { useEffect, useRef, useState, useCallback } from 'react';
import { deepGuardEngine } from '../services/mockWebSocketService';
import type { DeepGuardTelemetry, AttackSimulationPreset } from '../services/types';

interface UseFrameDispatcherOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
  intervalMs?: number; // 40-50ms (default 42ms ~24 FPS)
}

export function useFrameDispatcher({
  videoRef,
  enabled = true,
  intervalMs = 42,
}: UseFrameDispatcherOptions) {
  const [isStreaming, setIsStreaming] = useState<boolean>(enabled);
  const [telemetry, setTelemetry] = useState<DeepGuardTelemetry | null>(null);
  const [simulationPreset, setSimulationPresetState] = useState<AttackSimulationPreset>('GENUINE_LIVE_USER');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameIndexRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);

  // Initialize hidden canvas
  useEffect(() => {
    if (!canvasRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      canvasRef.current = canvas;
    }
  }, []);

  // Connect engine
  useEffect(() => {
    deepGuardEngine.start();
    const unsubTelemetry = deepGuardEngine.onTelemetry((payload) => {
      setTelemetry(payload);
    });

    return () => {
      unsubTelemetry();
    };
  }, []);

  // Frame capture loop
  const captureFrame = useCallback(() => {
    if (isProcessingRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState < 2 || video.paused || video.ended) {
      return;
    }

    isProcessingRef.current = true;
    try {
      const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
      if (ctx) {
        ctx.drawImage(video, 0, 0, 640, 480);
        frameIndexRef.current++;
      }
    } catch (err) {
      console.error('Frame capture exception:', err);
    } finally {
      isProcessingRef.current = false;
    }
  }, [videoRef]);

  // Set interval timer (40ms - 50ms)
  useEffect(() => {
    if (isStreaming) {
      timerRef.current = window.setInterval(captureFrame, intervalMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isStreaming, intervalMs, captureFrame]);

  const toggleStreaming = useCallback(() => {
    setIsStreaming((prev) => !prev);
  }, []);

  const setSimulationPreset = useCallback((preset: AttackSimulationPreset) => {
    setSimulationPresetState(preset);
    deepGuardEngine.setAttackPreset(preset);
  }, []);

  return {
    isStreaming,
    toggleStreaming,
    telemetry,
    simulationPreset,
    setSimulationPreset,
    canvasRef,
  };
}
