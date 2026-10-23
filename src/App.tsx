import React, { useState, useEffect, useRef } from 'react';
import { useMotionValue } from 'framer-motion';
import { useWebcam } from './hooks/useWebcam';
import { HeaderBar } from './components/enterprise/HeaderBar';
import { BiometricViewport } from './components/enterprise/BiometricViewport';
import { AuthenticityVerdictCard } from './components/enterprise/AuthenticityVerdictCard';
import { PlaneAnalysisGrid } from './components/enterprise/PlaneAnalysisGrid';
import { SessionAuditLog } from './components/enterprise/SessionAuditLog';
import { AttackSimulatorPresetBar } from './components/enterprise/AttackSimulatorPresetBar';
import { InteractiveCyberBackground } from './components/enterprise/InteractiveCyberBackground';
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

  // Global cursor-tracking motion coordinates
  const mouseX = useMotionValue(
    typeof window !== 'undefined' ? window.innerWidth / 2 : 500
  );
  const mouseY = useMotionValue(
    typeof window !== 'undefined' ? window.innerHeight / 3 : 300
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches && e.touches[0]) {
      mouseX.set(e.touches[0].clientX);
      mouseY.set(e.touches[0].clientY);
    }
  };

  // Optical webcam stream acquisition hook
  const {
    videoRef,
    isActive,
    isLoading,
    startCamera,
    stopCamera,
  } = useWebcam();

  // Initialize DeepGuard Telemetry Engine
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
    <div
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className="relative min-h-screen bg-[#0A0B0E] text-[#F8FAFC] flex flex-col font-sans antialiased selection:bg-[#0097A7]/30 selection:text-white"
    >
      {/* Interactive Touch & Cursor Tracking Reactive Background */}
      <InteractiveCyberBackground mouseX={mouseX} mouseY={mouseY} />

      {/* Foreground Content Stack */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* A. Top Header Bar */}
        <HeaderBar
          inputSource={inputSource}
          onSelectInputSource={handleSelectInputSource}
          healthStats={healthStats}
        />

        {/* Main Single-View Workspace Container */}
        <main className="flex-1 max-w-[1440px] w-full mx-auto p-6 flex flex-col justify-between space-y-5">
          {/* Interactive Attack Simulation Mode Toolbar */}
          <AttackSimulatorPresetBar
            currentPreset={attackPreset}
            onSelectPreset={handleSelectAttackPreset}
          />

          {/* 12-Column Desktop Grid (7 Columns Left, 5 Columns Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* B. Left Column (7 Columns): Uncluttered Biometric Viewport */}
            <div className="lg:col-span-7 flex flex-col">
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

            {/* C. Right Column (5 Columns): Structured Telemetry & Fusion Inspector */}
            <div className="lg:col-span-5 flex flex-col space-y-4">
              {/* 1. Primary Authenticity Verdict Card */}
              <AuthenticityVerdictCard fusion={telemetry?.fusion} />

              {/* 2. 4-Plane Analytical Breakdown (Compact 2×2 Grid) */}
              <PlaneAnalysisGrid
                planeA={telemetry?.plane_a_ela}
                planeB={telemetry?.plane_b_ear}
                planeC={telemetry?.plane_c_fft}
                neural={telemetry?.auxiliary_neural}
              />

              {/* 3. Collapsible Session Audit Log */}
              <SessionAuditLog
                logs={auditLogs}
                onExportReport={handleExportReport}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
