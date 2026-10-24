import React, { useState, useEffect, useRef } from 'react';
import { useWebcam } from './hooks/useWebcam';
import { HeaderBar } from './components/enterprise/HeaderBar';
import { BiometricViewport } from './components/enterprise/BiometricViewport';
import { AuthenticityVerdictCard } from './components/enterprise/AuthenticityVerdictCard';
import { PlaneAnalysisGrid } from './components/enterprise/PlaneAnalysisGrid';
import { SessionAuditLog } from './components/enterprise/SessionAuditLog';
import { AttackSimulatorPresetBar } from './components/enterprise/AttackSimulatorPresetBar';
import { deepGuardEngine } from './services/mockWebSocketService';
import type {
  AttackSimulationPreset,
  DeepGuardTelemetry,
  ForensicLogEntry,
  InputSourceMode,
  SystemHealthStats,
} from './services/types';

export const App: React.FC = () => {
  const [inputSource, setInputSource] = useState<InputSourceMode>('LIVE_WEBCAM');
  const [attackPreset, setAttackPreset] = useState<AttackSimulationPreset>('GENUINE_LIVE_USER');
  const [telemetry, setTelemetry] = useState<DeepGuardTelemetry | null>(null);
  const [healthStats, setHealthStats] = useState<SystemHealthStats | undefined>(undefined);
  const [auditLogs, setAuditLogs] = useState<ForensicLogEntry[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Optical webcam stream acquisition hook
  const {
    videoRef,
    isActive,
    isLoading,
    startCamera,
    stopCamera,
  } = useWebcam();

  // Initialize DeepGuard WebSocket Telemetry Engine
  useEffect(() => {
    deepGuardEngine.start();

    const unsubTelemetry = deepGuardEngine.onTelemetry((t) => {
      setTelemetry(t);
    });

    const unsubHealth = deepGuardEngine.onHealthStats((stats) => {
      setHealthStats(stats);
    });

    const unsubLogs = (deepGuardEngine as any).onLog((log: ForensicLogEntry) => {
      setAuditLogs((prev) => [log, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubTelemetry();
      unsubHealth();
      if (unsubLogs) unsubLogs();
      deepGuardEngine.stop();
    };
  }, []);

  // Handle Input Source Change
  const handleSelectInputSource = (source: InputSourceMode) => {
    setInputSource(source);
    deepGuardEngine.setInputSource(source);

    if (source === 'LIVE_WEBCAM') {
      startCamera();
    } else if (source === 'UPLOAD_VIDEO') {
      stopCamera();
    }
  };

  // Handle Attack Preset Change
  const handleSelectAttackPreset = (preset: AttackSimulationPreset) => {
    setAttackPreset(preset);
    deepGuardEngine.setAttackPreset(preset);
  };

  // Handle Local Video File Upload
  const handleUploadFile = (file: File) => {
    if (videoRef.current) {
      const fileUrl = URL.createObjectURL(file);
      videoRef.current.srcObject = null;
      videoRef.current.src = fileUrl;
      videoRef.current.loop = true;
      videoRef.current.play().catch(() => {});
    }
  };

  // Export JSON Forensic Report
  const handleExportReport = () => {
    const report = {
      product: 'DeepGuard Multi-Plane Video KYC Verification Engine',
      generated_at: new Date().toISOString(),
      session_summary: {
        verdict: telemetry?.fusion.verdict || 'GENUINE',
        authenticity_score: telemetry?.fusion.authenticity_score || 0.942,
        confidence_pct: telemetry?.fusion.confidence_pct || 96,
        model_source: telemetry?.fusion.model_source || 'fusion_model.joblib',
        frames_analyzed: telemetry?.frame_index || 0,
        blinks_detected: telemetry?.plane_b_ear.blink_count || 0,
      },
      latest_telemetry: telemetry,
      forensic_events: auditLogs,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepguard_kyc_audit_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative min-h-screen bg-[#08090C] text-[#F8FAFC] flex flex-col font-sans antialiased selection:bg-[#38BDF8]/30 selection:text-white">
      {/* Subtle Ambient Sub-Surface Cobalt & Obsidian Backdrop */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(circle at 18% 22%, rgba(37, 99, 235, 0.08) 0%, transparent 45%), radial-gradient(circle at 82% 70%, rgba(255, 107, 0, 0.05) 0%, transparent 45%)',
        }}
      />

      {/* Foreground Content Stack */}
      <div className="relative z-10 flex flex-col min-h-screen pb-10">
        {/* Signature A + Signature B: Editorial Serif Hero Banner & Stark Optical-Lens Manifesto Strip */}
        <HeaderBar
          inputSource={inputSource}
          onSelectInputSource={handleSelectInputSource}
          healthStats={healthStats}
          telemetry={telemetry}
        />

        {/* Main Workspace Container */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 pt-3 space-y-6">
          {/* Interactive WebSocket SET_MODE Preset Bar */}
          <AttackSimulatorPresetBar
            currentPreset={attackPreset}
            onSelectPreset={handleSelectAttackPreset}
          />

          {/* 12-Column Primary Stage: Signature C (7 Cols Left) + Signature D (5 Cols Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 7 Columns — Signature C (Ref 2): Precision Corner-Reticle Biometric Scanner HUD */}
            <div className="lg:col-span-7 flex flex-col justify-between">
              <BiometricViewport
                videoRef={videoRef}
                canvasRef={canvasRef}
                telemetry={telemetry}
                isActive={isActive}
                isLoading={isLoading}
                inputSource={inputSource}
                onStartCamera={startCamera}
                onStopCamera={stopCamera}
                onUploadFile={handleUploadFile}
              />
            </div>

            {/* Right 5 Columns — Signature D (Ref 4): Eclipsed Horizon Score Card & Inner-Glow Frosted Pill Wall */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-5">
              <AuthenticityVerdictCard fusion={telemetry?.fusion} />
              <SessionAuditLog
                logs={auditLogs}
                onExportReport={handleExportReport}
                telemetry={telemetry}
              />
            </div>
          </div>

          {/* Bottom 3-Column Bento Row — Signature E (Ref 1): Three Tall Obsidian Cards with Sub-Surface Cobalt 3D Visuals */}
          <section className="pt-1">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#38BDF8] inline-block" />
                <span className="text-[11px] font-geometric-display uppercase tracking-[0.22em] text-white/75 font-bold">
                  MULTI-PLANE SUB-SURFACE FORENSIC ARCHITECTURE
                </span>
              </div>
              <span className="text-[10px] font-mono-tabular tracking-[0.18em] text-white/40 uppercase">
                PLANE A (ELA) • PLANE C (2D-FFT) • PLANE B + AUX (EAR / ViT)
              </span>
            </div>

            <PlaneAnalysisGrid
              planeA={telemetry?.plane_a_ela}
              planeB={telemetry?.plane_b_ear}
              planeC={telemetry?.plane_c_fft}
              neural={telemetry?.auxiliary_neural}
            />
          </section>
        </main>
      </div>
    </div>
  );
};

export default App;
