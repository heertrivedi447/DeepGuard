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

  // 30-frame rolling window for EAR
  private earHistory: number[] = Array(30).fill(0.29);
  private blinkCount = 6;
  private lastBlinkTime = performance.now();
  private isBlinkingNow = false;

  // Cached auxiliary ViT inference
  private cachedViTProb = 0.04;
  private latestTelemetry: DeepGuardTelemetry | null = null;

  // Head / Face movement simulation
  private faceRoi: FaceROI = {
    x: 0.32,
    y: 0.24,
    width: 0.36,
    height: 0.48,
    confidence: 0.992,
  };

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.sessionStartTime = performance.now();

    // 40ms interval (~25 FPS)
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
  }

  setInputSource(source: InputSourceMode): void {
    this._inputSource = source;
  }

  getInputSource(): InputSourceMode {
    return this._inputSource;
  }

  setAttackPreset(preset: AttackSimulationPreset): void {
    this.currentPreset = preset;
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
    const now = performance.now();
    const sessionTimeSec = Math.floor((now - this.sessionStartTime) / 1000);

    // Subtle natural head movement drift
    const driftX = Math.sin(now * 0.001) * 0.008;
    const driftY = Math.cos(now * 0.0012) * 0.006;
    this.faceRoi = {
      x: 0.32 + driftX,
      y: 0.24 + driftY,
      width: 0.36,
      height: 0.48,
      confidence: 0.991,
    };

    // --- PLANE B: EAR Liveness ---
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
          this.emitLog({
            id: `${Date.now()}-${this.frameIndex}`,
            timestamp: new Date().toLocaleTimeString(),
            frame_index: this.frameIndex,
            category: 'LIVENESS',
            message: `Blink verified (EAR dip 0.14 < 0.22) • Blink count: ${this.blinkCount}`,
            severity: 'NORMAL',
          });
        }
      } else {
        this.isBlinkingNow = false;
      }
    }

    // Update 30-frame rolling window
    this.earHistory.push(Math.round(earRaw * 1000) / 1000);
    if (this.earHistory.length > 30) {
      this.earHistory.shift();
    }

    // --- PLANE A: Spatial Integrity (ELA) ---
    let elaAnomaly = 0.12 + Math.random() * 0.03;
    let q90Residual = 0.038;
    let macroblockConsistent = true;
    let seamDivergence = false;

    if (this.currentPreset === 'FACESWAP_BOUNDARY_SPLICE') {
      elaAnomaly = 0.88 + (Math.random() - 0.5) * 0.06;
      q90Residual = 0.294;
      macroblockConsistent = false;
      seamDivergence = true;

      if (this.frameIndex % 60 === 0) {
        this.emitLog({
          id: `${Date.now()}-${this.frameIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          frame_index: this.frameIndex,
          category: 'SPATIAL',
          message: `JPEG Q=90 boundary seam divergence detected (ELA: ${(elaAnomaly).toFixed(2)})`,
          severity: 'CRITICAL',
        });
      }
    }

    // --- PLANE C: Spectral Purity (2D FFT) ---
    let fftAnomaly = 0.08 + Math.random() * 0.04;
    let highPassEnergy = 0.18;
    let checkerboard = false;

    if (this.currentPreset === 'GAN_UPSAMPLING_STREAM') {
      fftAnomaly = 0.91 + (Math.random() - 0.5) * 0.05;
      highPassEnergy = 0.84;
      checkerboard = true;

      if (this.frameIndex % 60 === 0) {
        this.emitLog({
          id: `${Date.now()}-${this.frameIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          frame_index: this.frameIndex,
          category: 'SPECTRAL',
          message: `High-frequency circular DFT energy spike detected (FFT: ${(fftAnomaly).toFixed(2)})`,
          severity: 'CRITICAL',
        });
      }
    }

    // --- AUXILIARY NEURAL LAYER (ViT / SigLIP 5-Frame Scheduler) ---
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

      if (this.frameIndex % 45 === 0) {
        this.emitLog({
          id: `${Date.now()}-${this.frameIndex}`,
          timestamp: new Date().toLocaleTimeString(),
          frame_index: this.frameIndex,
          category: 'NEURAL',
          message: `ViT keyframe #${this.frameIndex} evaluated (P_fake = ${this.cachedViTProb.toFixed(2)})`,
          severity: this.cachedViTProb > 0.5 ? 'CRITICAL' : 'NORMAL',
        });
      }
    }

    // --- ENSEMBLE FUSION VERDICT (LinearSVM) ---
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

    // 12 Eye Landmarks (p1..p6 for each eye)
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
        compressionArtifactDiscrepancy: Math.round(elaAnomaly * 100),
        meanResidualDifference: q90Residual,
        highFreqNoiseMismatch: Math.round(elaAnomaly * 80),
        gridConsistency: macroblockConsistent,
        status: macroblockConsistent ? 'OPTIMAL' : 'TAMPERED',
        residualIntensityGrid: [12, 18, 15, 22, 14, 19, 16, 20],
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
        earValue: Math.round(earRaw * 1000) / 1000,
        leftEyeEar: Math.round((earRaw - 0.004) * 1000) / 1000,
        rightEyeEar: Math.round((earRaw + 0.004) * 1000) / 1000,
        isBlinking: this.isBlinkingNow,
        blinkCount: this.blinkCount,
        blinkRatePerMin: 18,
        livenessConfidence: Math.round(livenessScore * 100),
        headPose: { pitch: 0.2, yaw: -0.5, roll: 0.1 },
        trackingStatus: 'LOCKED',
        facialBoundingBox: this.faceRoi,
        landmarks: eyeLandmarks,
      },
      plane_c_fft: {
        fft_anomaly: Math.round(fftAnomaly * 1000) / 1000,
        high_pass_energy: highPassEnergy,
        checkerboard_detected: checkerboard,
        highFreqPower: Math.round(highPassEnergy * 100),
        azimuthalSymmetryScore: Math.round((1 - fftAnomaly) * 100),
        periodicPatternAnomaly: Math.round(fftAnomaly * 100),
        spectralEntropy: 3.42,
        frequencyBands: [88, 80, 74, 65, 58, 50, 42, 35, 28, 22, 17, 14, 11, 8, 6, 5],
        status: checkerboard ? 'GAN_CHECKERBOARD' : 'NATURAL',
      },
      auxiliary_neural: {
        neural_fake_prob: Math.round(this.cachedViTProb * 1000) / 1000,
        is_keyframe: isKeyframe,
        keyframe_interval: 5,
        keyframe_index: Math.floor(this.frameIndex / 5),
        cached: !isKeyframe,
        modelArchitecture: 'SigLIP-SO400M / ViT-L/14 (Frozen)',
        fakeProbability: Math.round(this.cachedViTProb * 1000) / 1000,
        syntheticArtifactConfidence: Math.round(this.cachedViTProb * 100),
        latentCosineDistance: Math.round((0.14 + this.cachedViTProb * 0.7) * 1000) / 1000,
        attentionHotspots: isGenuine ? 1 : 5,
        status: isGenuine ? 'NATURAL_ORGANIC' : 'HIGH_CONFIDENCE_DEEPFAKE',
      },
      fusion: {
        authenticity_score: Math.round(authenticityScore * 1000) / 1000,
        is_genuine: isGenuine,
        verdict: verdict,
        confidence_pct: confidencePct,
        model_source: 'fusion_model.joblib (Calibrated LinearSVM)',
        latency_ms: 18,
        reasons: reasons,
        modelType: 'Calibrated LinearSVM (fusion_model.joblib)',
        featureVector: {
          elaDiscrepancy: Math.round(elaAnomaly * 1000) / 1000,
          earAnomaly: Math.round((1 - livenessScore) * 1000) / 1000,
          fftAnomaly: Math.round(fftAnomaly * 1000) / 1000,
          vitFakeProb: Math.round(this.cachedViTProb * 1000) / 1000,
        },
        weights: { w_ela: -2.8, w_ear: 3.6, w_fft: -2.9, w_vit: -3.8, bias: 2.4 },
        decisionThreshold: 0.5,
        rawLogit: Math.round(z * 100) / 100,
        probabilityFake: Math.round((1 - authenticityScore) * 1000) / 1000,
        authenticityConfidence: confidencePct,
      },
    };

    this.latestTelemetry = telemetry;
    this.telemetryCallbacks.forEach((cb) => cb(telemetry));

    const healthStats: SystemHealthStats = {
      fps: 24.8,
      keyframe_cache_status: 'Every 5th Frame',
      fusion_model_status: 'Calibrated LinearSVM • Active',
      frames_processed: this.frameIndex,
      connected: true,
      framesSent: this.frameIndex,
      framesReceived: this.frameIndex,
      droppedFrames: 0,
      effectiveFps: 24.8,
      bytesSent: this.frameIndex * 42000,
      avgLatencyMs: 18,
      serviceType: 'INTERNAL_MOCK_ENGINE',
    };
    this.healthCallbacks.forEach((cb) => cb(healthStats));
  }
}

export const deepGuardEngine = new DeepGuardMockEngine();
export const MockWebSocketService = DeepGuardMockEngine;
