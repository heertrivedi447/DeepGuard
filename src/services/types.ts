export type InputSourceMode = 'LIVE_WEBCAM' | 'UPLOAD_VIDEO' | 'ATTACK_SIMULATOR';

export type AttackSimulationPreset = 
  | 'GENUINE_LIVE_USER'
  | 'STATIC_PHOTO_REPLAY'
  | 'FACESWAP_BOUNDARY_SPLICE'
  | 'GAN_UPSAMPLING_STREAM';

// Backward compatibility alias
export type AttackSimulationMode = AttackSimulationPreset;

export interface EyeLandmark {
  id: string; // p1 to p6
  x: number;  // normalized [0, 1]
  y: number;  // normalized [0, 1]
  eye: 'left' | 'right';
}

export type LandmarkPoint = EyeLandmark;

export interface FaceROI {
  x: number;      // normalized 0-1
  y: number;      // normalized 0-1
  width: number;  // normalized 0-1
  height: number; // normalized 0-1
  confidence: number;
}

export type FacialBoundingBox = FaceROI;

export interface PlaneA_ELA {
  ela_anomaly: number;       // [0.0, 1.0]
  q90_residual: number;      // normalized error residual
  macroblock_consistency: boolean;
  seam_divergence_detected: boolean;
  compressionArtifactDiscrepancy?: number;
  meanResidualDifference?: number;
  highFreqNoiseMismatch?: number;
  gridConsistency?: boolean;
  status?: string;
  residualIntensityGrid?: number[];
}

export type ELAMetrics = PlaneA_ELA;

export interface PlaneB_EAR {
  ear_raw: number;           // [0.0, 1.0], typical 0.28-0.34
  threshold: number;         // 0.22
  liveness_score: number;    // [0.0, 1.0] across rolling 30-frame window
  is_blink: boolean;
  blink_count: number;
  ear_history: number[];     // last 30 frames for SVG sparkline
  eye_landmarks: EyeLandmark[];
  face_roi: FaceROI;
  earValue?: number;
  leftEyeEar?: number;
  rightEyeEar?: number;
  isBlinking?: boolean;
  blinkCount?: number;
  blinkRatePerMin?: number;
  livenessConfidence?: number;
  headPose?: { pitch: number; yaw: number; roll: number };
  trackingStatus?: string;
  facialBoundingBox?: FaceROI;
  landmarks?: EyeLandmark[];
}

export type EARLivenessMetrics = PlaneB_EAR;

export interface PlaneC_FFT {
  fft_anomaly: number;       // [0.0, 1.0]
  high_pass_energy: number;  // circular high-frequency energy ratio
  checkerboard_detected: boolean;
  highFreqPower?: number;
  azimuthalSymmetryScore?: number;
  periodicPatternAnomaly?: number;
  spectralEntropy?: number;
  frequencyBands?: number[];
  status?: string;
}

export type FFTSpectrumMetrics = PlaneC_FFT;

export interface AuxiliaryNeural {
  neural_fake_prob: number;  // [0.0, 1.0]
  is_keyframe: boolean;      // evaluated on 5-frame scheduler
  keyframe_interval: number; // 5
  keyframe_index: number;
  cached: boolean;
  modelArchitecture?: string;
  fakeProbability?: number;
  syntheticArtifactConfidence?: number;
  latentCosineDistance?: number;
  attentionHotspots?: number;
  status?: string;
}

export type NeuralViTMetrics = AuxiliaryNeural;

export interface EnsembleFusionVerdict {
  authenticity_score: number; // [0.0, 1.0] (0 to 100%)
  is_genuine: boolean;
  verdict: 'GENUINE' | 'FRAUD DETECTED' | 'CALIBRATING';
  confidence_pct: number;
  model_source: 'fusion_model.joblib (Calibrated LinearSVM)' | 'Fallback Heuristic (0.40·EAR + 0.30·(1−ELA) + 0.30·(1−FFT))';
  latency_ms: number;
  reasons: string[];
  modelType?: string;
  featureVector?: {
    elaDiscrepancy: number;
    earAnomaly: number;
    fftAnomaly: number;
    vitFakeProb: number;
  };
  weights?: {
    w_ela: number;
    w_ear: number;
    w_fft: number;
    w_vit: number;
    bias: number;
  };
  decisionThreshold?: number;
  rawLogit?: number;
  probabilityFake?: number;
  authenticityConfidence?: number;
}

export type FusionClassifierResult = EnsembleFusionVerdict;

export interface ForensicLogEntry {
  id: string;
  timestamp: string;
  frame_index: number;
  category: 'LIVENESS' | 'SPATIAL' | 'SPECTRAL' | 'NEURAL' | 'VERDICT';
  message: string;
  severity: 'NORMAL' | 'CAUTION' | 'CRITICAL';
}

export interface DeepGuardTelemetry {
  timestamp: number;
  frame_index: number;
  session_time_seconds: number;
  fps: number;
  plane_a_ela: PlaneA_ELA;
  plane_b_ear: PlaneB_EAR;
  plane_c_fft: PlaneC_FFT;
  auxiliary_neural: AuxiliaryNeural;
  fusion: EnsembleFusionVerdict;
}

export type TelemetryPayload = DeepGuardTelemetry;

export interface SystemHealthStats {
  fps: number;
  keyframe_cache_status: string;
  fusion_model_status: string;
  frames_processed: number;
  connected: boolean;
  framesSent?: number;
  framesReceived?: number;
  droppedFrames?: number;
  effectiveFps?: number;
  bytesSent?: number;
  avgLatencyMs?: number;
  serviceType?: string;
}

export type DispatchStats = SystemHealthStats;

export interface IDeepGuardEngine {
  start(): void;
  stop(): void;
  setInputSource(source: InputSourceMode): void;
  setAttackPreset(preset: AttackSimulationPreset): void;
  onTelemetry(callback: (t: DeepGuardTelemetry) => void): () => void;
  onHealthStats(callback: (stats: SystemHealthStats) => void): () => void;
  getLatestTelemetry(): DeepGuardTelemetry | null;
}

export type IDeepGuardService = IDeepGuardEngine;
