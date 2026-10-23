import type {
  AttackSimulationPreset,
  DeepGuardTelemetry,
  EyeLandmark,
  FaceROI,
  ForensicLogEntry,
  IDeepGuardEngine,
  InputSourceMode,
  SystemHealthStats,
} from './types';

const WS_URL = 'ws://localhost:8000/ws/stream';

export class DeepGuardMockEngine implements IDeepGuardEngine {
  private isRunning = false;
  private telemetryCallbacks: Set<(t: DeepGuardTelemetry) => void> = new Set();
  private healthCallbacks: Set<(s: SystemHealthStats) => void> = new Set();
  private logCallbacks: Set<(log: ForensicLogEntry) => void> = new Set();

  private _inputSource: InputSourceMode = 'LIVE_WEBCAM';
  private currentPreset: AttackSimulationPreset = 'GENUINE_LIVE_USER';

  private frameIndex = 0;
  private sessionStartTime = performance.now();
  private loopIntervalId: number | null = null;

  // Live WebSocket state
  private ws: WebSocket | null = null;
  private wsConnected = false;
  private awaitingWsReply = false;
  private lastDispatchTime = 0;
  private captureCanvas: HTMLCanvasElement | null = null;
  private lastServerBlinkCount = 0;

  // 30-frame rolling window for local fallback EAR
  private earHistory: number[] = Array(30).fill(0.29);
  private blinkCount = 6;
  private lastBlinkTime = performance.now();
  private isBlinkingNow = false;

  // Cached auxiliary ViT inference
  private cachedViTProb = 0.04;
  private latestTelemetry: DeepGuardTelemetry | null = null;

  private faceRoi: FaceROI = {
    x: 0.32,
    y: 0.24,
    width: 0.36,
    height: 0.48,
    confidence: 0.992,
  };

  private connectWebSocket(): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const socket = new WebSocket(WS_URL);
      this.ws = socket;

      socket.onopen = () => {
        this.wsConnected = true;
        this.awaitingWsReply = false;
        socket.send(
          JSON.stringify({
            type: 'SET_MODE',
            preset: this.currentPreset,
          })
        );
        this.emitLog({
          id: `${Date.now()}-ws`,
          timestamp: new Date().toLocaleTimeString(),
          frame_index: this.frameIndex,
          category: 'VERDICT',
          message: 'Connected to live FastAPI WebSocket engine (ws://localhost:8000/ws/stream)',
          severity: 'NORMAL',
        });
      };

      socket.onmessage = (event) => {
        this.awaitingWsReply = false;
        try {
          const telemetry: DeepGuardTelemetry = JSON.parse(event.data);
          this.latestTelemetry = telemetry;
          this.telemetryCallbacks.forEach((cb) => cb(telemetry));

          if (telemetry.plane_b_ear.blink_count > this.lastServerBlinkCount) {
            this.lastServerBlinkCount = telemetry.plane_b_ear.blink_count;
            this.emitLog({
              id: `${Date.now()}-${telemetry.frame_index}`,
              timestamp: new Date().toLocaleTimeString(),
              frame_index: telemetry.frame_index,
              category: 'LIVENESS',
              message: `Blink verified (EAR ${telemetry.plane_b_ear.ear_raw.toFixed(2)} < 0.22) • Blink count: ${telemetry.plane_b_ear.blink_count}`,
              severity: 'NORMAL',
            });
          }

          const rttMs = Math.max(1, Math.round(performance.now() - this.lastDispatchTime));
          const healthStats: SystemHealthStats = {
            fps: telemetry.fps || 24.8,
            keyframe_cache_status: 'Every 5th Frame',
            fusion_model_status: 'Calibrated LinearSVM • Live WS',
            frames_processed: telemetry.frame_index,
            connected: true,
            framesSent: this.frameIndex,
            framesReceived: telemetry.frame_index,
            droppedFrames: 0,
            effectiveFps: telemetry.fps || 24.8,
            bytesSent: this.frameIndex * 28000,
            avgLatencyMs: telemetry.fusion.latency_ms || rttMs,
            serviceType: 'FASTAPI_WEBSOCKET_ENGINE',
          };
          this.healthCallbacks.forEach((cb) => cb(healthStats));
        } catch {
          // Ignore malformed packet
        }
      };

      socket.onclose = () => {
        this.wsConnected = false;
        this.awaitingWsReply = false;
      };

      socket.onerror = () => {
        this.wsConnected = false;
        this.awaitingWsReply = false;
      };
    } catch {
      this.wsConnected = false;
    }
  }

  private captureVideoFrameBase64(): string {
    if (typeof document === 'undefined') return '';
    const video = document.querySelector('video');
    if (!video || video.readyState < 2 || video.videoWidth === 0) {
      return '';
    }
    if (!this.captureCanvas) {
      this.captureCanvas = document.createElement('canvas');
      this.captureCanvas.width = 640;
      this.captureCanvas.height = 480;
    }
    const ctx = this.captureCanvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(video, 0, 0, 640, 480);
    return this.captureCanvas.toDataURL('image/jpeg', 0.72);
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sessionStartTime = performance.now();
    this.connectWebSocket();

    // 42ms interval (~24 FPS)
    this.loopIntervalId = window.setInterval(() => {
      this.tick();
    }, 42);
  }

  stop(): void {
    this.isRunning = false;
    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }
  }

  setInputSource(source: InputSourceMode): void {
    this._inputSource = source;
  }

  getInputSource(): InputSourceMode {
    return this._inputSource;
  }

  setAttackPreset(preset: AttackSimulationPreset): void {
    this.currentPreset = preset;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: 'SET_MODE',
          preset,
        })
      );
    }
    this.emitLog({
      id: `${Date.now()}-${this.frameIndex}`,
      timestamp: new Date().toLocaleTimeString(),
      frame_index: this.frameIndex,
      category: 'VERDICT',
      message: `Reviewer switched profile to: ${preset.replace(/_/g, ' ')}`,
      severity: preset === 'GENUINE_LIVE_USER' ? 'NORMAL' : 'CRITICAL',
    });
  }

  onTelemetry(callback: (t: DeepGuardTelemetry) => void): () => void {
    this.telemetryCallbacks.add(callback);
    return () => this.telemetryCallbacks.delete(callback);
  }

  onHealthStats(callback: (stats: SystemHealthStats) => void): () => void {
    this.healthCallbacks.add(callback);
    return () => this.healthCallbacks.delete(callback);
  }

  onLog(callback: (log: ForensicLogEntry) => void): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  getLatestTelemetry(): DeepGuardTelemetry | null {
    return this.latestTelemetry;
  }

  private emitLog(log: ForensicLogEntry): void {
    this.logCallbacks.forEach((cb) => cb(log));
  }

  private tick(): void {
    this.frameIndex++;

    // Periodically attempt reconnect if WebSocket is closed
    if (!this.wsConnected && this.frameIndex % 48 === 0) {
      this.connectWebSocket();
    }

    // If connected to FastAPI WebSocket server, dispatch frame over ws://localhost:8000/ws/stream
    if (this.wsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (!this.awaitingWsReply) {
        this.awaitingWsReply = true;
        this.lastDispatchTime = performance.now();
        const imageB64 = this.captureVideoFrameBase64();
        this.ws.send(
          JSON.stringify({
            type: 'FRAME_DISPATCH',
            frame_index: this.frameIndex,
            timestamp: Date.now(),
            image: imageB64,
          })
        );
      }
      return;
    }

    // Fallback local simulation when backend server is not yet started
    const now = performance.now();
    const sessionTimeSec = Math.floor((now - this.sessionStartTime) / 1000);

    const driftX = Math.sin(now * 0.001) * 0.008;
    const driftY = Math.cos(now * 0.0012) * 0.006;
    this.faceRoi = {
      x: 0.32 + driftX,
      y: 0.24 + driftY,
      width: 0.36,
      height: 0.48,
      confidence: 0.991,
    };

    let earRaw = 0.29 + (Math.random() - 0.5) * 0.015;
    let livenessScore = 0.96;

    if (this.currentPreset === 'STATIC_PHOTO_REPLAY') {
      earRaw = 0.292;
      this.isBlinkingNow = false;
      livenessScore = 0.08;
    } else {
      const timeSinceBlink = now - this.lastBlinkTime;
      if (timeSinceBlink > 3800) {
        if (timeSinceBlink < 4000) {
          this.isBlinkingNow = true;
          earRaw = 0.14 + Math.random() * 0.03;
        } else {
          this.isBlinkingNow = false;
          this.lastBlinkTime = now;
          this.blinkCount++;
        }
      } else {
        this.isBlinkingNow = false;
      }
    }

    this.earHistory.push(Math.round(earRaw * 1000) / 1000);
    if (this.earHistory.length > 30) {
      this.earHistory.shift();
    }

    let elaAnomaly = 0.12 + Math.random() * 0.03;
    let q90Residual = 0.038;
    let macroblockConsistent = true;
    let seamDivergence = false;

    if (this.currentPreset === 'FACESWAP_BOUNDARY_SPLICE') {
      elaAnomaly = 0.88 + (Math.random() - 0.5) * 0.06;
      q90Residual = 0.294;
      macroblockConsistent = false;
      seamDivergence = true;
    }

    let fftAnomaly = 0.08 + Math.random() * 0.04;
    let highPassEnergy = 0.18;
    let checkerboard = false;

    if (this.currentPreset === 'GAN_UPSAMPLING_STREAM') {
      fftAnomaly = 0.91 + (Math.random() - 0.5) * 0.05;
      highPassEnergy = 0.84;
      checkerboard = true;
    }

    const isKeyframe = this.frameIndex % 5 === 0;
    if (isKeyframe) {
      if (
        this.currentPreset === 'FACESWAP_BOUNDARY_SPLICE' ||
        this.currentPreset === 'GAN_UPSAMPLING_STREAM'
      ) {
        this.cachedViTProb = 0.94 + Math.random() * 0.04;
      } else if (this.currentPreset === 'STATIC_PHOTO_REPLAY') {
        this.cachedViTProb = 0.32 + Math.random() * 0.06;
      } else {
        this.cachedViTProb = 0.03 + Math.random() * 0.03;
      }
    }

    const z =
      -2.8 * elaAnomaly +
      3.6 * livenessScore -
      2.9 * fftAnomaly -
      3.8 * this.cachedViTProb +
      2.4;

    const authenticityScore = 1 / (1 + Math.exp(-z));
    const isGenuine = authenticityScore >= 0.5;
    const verdict = isGenuine ? 'GENUINE' : 'FRAUD DETECTED';
    const confidencePct = Math.round(
      (isGenuine ? authenticityScore : 1 - authenticityScore) * 100
    );

    const reasons: string[] = [];
    if (this.cachedViTProb > 0.6) reasons.push('Semantic ViT synthetic manifold detected');
    if (seamDivergence) reasons.push('Spatial JPEG boundary seam discontinuity');
    if (checkerboard) reasons.push('Spectral high-frequency periodic checkerboard harmonics');
    if (livenessScore < 0.4) reasons.push('Ocular liveness failure (static frame / no blinks)');
    if (reasons.length === 0) {
      reasons.push('Coherent multi-plane biometric integrity verified');
      reasons.push('Natural ocular saccades & blink cadence confirmed');
    }

    const eyeLandmarks: EyeLandmark[] = [
      { id: 'p1', x: this.faceRoi.x + 0.11, y: this.faceRoi.y + 0.16, eye: 'left' },
      { id: 'p2', x: this.faceRoi.x + 0.13, y: this.faceRoi.y + 0.15 - (this.isBlinkingNow ? 0.002 : 0.01), eye: 'left' },
      { id: 'p3', x: this.faceRoi.x + 0.15, y: this.faceRoi.y + 0.15 - (this.isBlinkingNow ? 0.002 : 0.01), eye: 'left' },
      { id: 'p4', x: this.faceRoi.x + 0.17, y: this.faceRoi.y + 0.16, eye: 'left' },
      { id: 'p5', x: this.faceRoi.x + 0.15, y: this.faceRoi.y + 0.165 + (this.isBlinkingNow ? 0.002 : 0.01), eye: 'left' },
      { id: 'p6', x: this.faceRoi.x + 0.13, y: this.faceRoi.y + 0.165 + (this.isBlinkingNow ? 0.002 : 0.01), eye: 'left' },

      { id: 'p1', x: this.faceRoi.x + 0.21, y: this.faceRoi.y + 0.16, eye: 'right' },
      { id: 'p2', x: this.faceRoi.x + 0.23, y: this.faceRoi.y + 0.15 - (this.isBlinkingNow ? 0.002 : 0.01), eye: 'right' },
      { id: 'p3', x: this.faceRoi.x + 0.25, y: this.faceRoi.y + 0.15 - (this.isBlinkingNow ? 0.002 : 0.01), eye: 'right' },
      { id: 'p4', x: this.faceRoi.x + 0.27, y: this.faceRoi.y + 0.16, eye: 'right' },
      { id: 'p5', x: this.faceRoi.x + 0.25, y: this.faceRoi.y + 0.165 + (this.isBlinkingNow ? 0.002 : 0.01), eye: 'right' },
      { id: 'p6', x: this.faceRoi.x + 0.23, y: this.faceRoi.y + 0.165 + (this.isBlinkingNow ? 0.002 : 0.01), eye: 'right' },
    ];

    const telemetry: DeepGuardTelemetry = {
      timestamp: Date.now(),
      frame_index: this.frameIndex,
      session_time_seconds: sessionTimeSec,
      fps: 24.8,
      plane_a_ela: {
        ela_anomaly: Math.round(elaAnomaly * 1000) / 1000,
        q90_residual: q90Residual,
        macroblock_consistency: macroblockConsistent,
        seam_divergence_detected: seamDivergence,
      },
      plane_b_ear: {
        ear_raw: Math.round(earRaw * 1000) / 1000,
        threshold: 0.22,
        liveness_score: Math.round(livenessScore * 100) / 100,
        is_blink: this.isBlinkingNow,
        blink_count: this.blinkCount,
        ear_history: [...this.earHistory],
        eye_landmarks: eyeLandmarks,
        face_roi: this.faceRoi,
      },
      plane_c_fft: {
        fft_anomaly: Math.round(fftAnomaly * 1000) / 1000,
        high_pass_energy: highPassEnergy,
        checkerboard_detected: checkerboard,
      },
      auxiliary_neural: {
        neural_fake_prob: Math.round(this.cachedViTProb * 1000) / 1000,
        is_keyframe: isKeyframe,
        keyframe_interval: 5,
        keyframe_index: Math.floor(this.frameIndex / 5),
        cached: !isKeyframe,
      },
      fusion: {
        authenticity_score: Math.round(authenticityScore * 1000) / 1000,
        is_genuine: isGenuine,
        verdict: verdict,
        confidence_pct: confidencePct,
        model_source: 'fusion_model.joblib (Calibrated LinearSVM)',
        latency_ms: 18,
        reasons: reasons,
      },
    };

    this.latestTelemetry = telemetry;
    this.telemetryCallbacks.forEach((cb) => cb(telemetry));
  }
}

export const deepGuardEngine = new DeepGuardMockEngine();
export const MockWebSocketService = DeepGuardMockEngine;
