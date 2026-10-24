import React, { useState } from 'react';
import { CameraOff, Camera as CameraIcon, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FaceRoiOverlay } from './FaceRoiOverlay';
import type { DeepGuardTelemetry, InputSourceMode } from '../../services/types';

interface BiometricViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  telemetry: DeepGuardTelemetry | null;
  isActive: boolean;
  isLoading: boolean;
  inputSource: InputSourceMode;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onUploadFile?: (file: File) => void;
}

export const BiometricViewport: React.FC<BiometricViewportProps> = ({
  videoRef,
  canvasRef,
  telemetry,
  isActive,
  isLoading,
  inputSource,
  onStartCamera,
  onStopCamera,
  onUploadFile,
}) => {
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  const isGenuine = telemetry?.fusion.is_genuine ?? true;
  const verdict = isGenuine ? 'GENUINE' : 'FRAUD DETECTED';
  const accentColor = isGenuine ? '#38BDF8' : '#FF6B00';

  // Live metrics for the 4-Corner Micro-Telemetry Overlays (Ref 2)
  const elaScorePct = Math.round((1 - (telemetry?.plane_a_ela.ela_anomaly ?? 0.08)) * 100);
  const earScorePct = Math.round((telemetry?.plane_b_ear.liveness_score ?? 0.94) * 100);
  const fftScorePct = Math.round((1 - (telemetry?.plane_c_fft.fft_anomaly ?? 0.09)) * 100);
  const vitScorePct = Math.round((1 - (telemetry?.auxiliary_neural.neural_fake_prob ?? 0.05)) * 100);

  // 16-bar frequency bands for Top-Right Spectral Equalizer
  const rawBands = telemetry?.plane_c_fft.frequencyBands ?? [
    0.85, 0.72, 0.64, 0.52, 0.45, 0.38, 0.31, 0.28,
    0.24, 0.22, 0.19, 0.25, 0.32, 0.28, 0.18, 0.14,
  ];
  const eqBands = Array.from({ length: 16 }, (_, i) => {
    const v = rawBands[i % rawBands.length] ?? 0.3;
    return Math.max(0.12, Math.min(1.0, v));
  });

  // 30-frame EAR history for Bottom-Left Node Graph Sparkline
  const earHistory = telemetry?.plane_b_ear.ear_history?.length
    ? telemetry.plane_b_ear.ear_history
    : [0.31, 0.30, 0.29, 0.31, 0.19, 0.28, 0.32, 0.31, 0.30, 0.31, 0.29, 0.32];

  // Sample 6 key nodes from earHistory for the connected node-graph sparkline (Ref 2)
  const nodeSamples = [0, 0.2, 0.4, 0.6, 0.8, 1.0].map((t, idx) => {
    const pos = Math.min(earHistory.length - 1, Math.floor(t * (earHistory.length - 1)));
    const val = earHistory[pos] ?? 0.3;
    const normY = 38 - Math.max(0, Math.min(1, (val - 0.12) / 0.26)) * 28;
    const normX = 12 + idx * 26;
    return { x: normX, y: normY, pct: Math.round((val / 0.35) * 100) };
  });
  const polylinePoints = nodeSamples.map((n) => `${n.x},${n.y}`).join(' ');

  // Bottom-Right 4 Tabular Monospace Index Rows (Ref 2: 06 ⊖ ⊕, 08 ⊖ ⊕, 05 ⊖ ⊕, 04 ⊖ ⊕)
  const indexRows = [
    {
      code: '06',
      label: 'EAR',
      val: (telemetry?.plane_b_ear.ear_raw ?? 0.31).toFixed(2),
    },
    {
      code: '08',
      label: 'ELA',
      val: (telemetry?.plane_a_ela.ela_anomaly ?? 0.08).toFixed(2),
    },
    {
      code: '05',
      label: 'FFT',
      val: (telemetry?.plane_c_fft.fft_anomaly ?? 0.09).toFixed(2),
    },
    {
      code: '04',
      label: 'ViT',
      val: (telemetry?.auxiliary_neural.neural_fake_prob ?? 0.04).toFixed(2),
    },
  ];

  // Session time formatting
  const sessionSec = telemetry?.session_time_seconds ?? 0;
  const minStr = Math.floor(sessionSec / 60)
    .toString()
    .padStart(2, '0');
  const secStr = (sessionSec % 60).toString().padStart(2, '0');

  const handleSnapshot = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    ctx.fillStyle = 'rgba(3, 7, 20, 0.92)';
    ctx.fillRect(0, 444, 640, 36);
    ctx.fillStyle = '#38BDF8';
    ctx.font = 'bold 11px JetBrains Mono, monospace';
    ctx.fillText('DEEPGUARD // MULTI-PLANE OPTICAL SCANNER', 16, 466);
    ctx.fillStyle = isGenuine ? '#10B981' : '#FF6B00';
    ctx.fillText(`VERDICT: ${verdict}`, 450, 466);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `deepguard_forensic_${Date.now()}.png`;
    a.click();

    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadFile) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-3">
      {/* Signature C (Ref 2): Deep-Midnight Precision Corner-Reticle Biometric Scanner HUD */}
      <div className="relative w-full aspect-[16/10] scanner-hud-stage rounded-[26px] overflow-hidden select-none">
        {/* Hidden Canvas for Base64 Frame Dispatch */}
        <canvas ref={canvasRef} className="hidden" width={640} height={480} />

        {/* Live Video Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isActive ? 'opacity-95 contrast-105' : 'opacity-15'
          }`}
        />

        {/* Subtle Dark Radial Vignette so HUD Corner Telemetry Pops Cleanly */}
        <div
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            background:
              'radial-gradient(circle at 50% 50%, transparent 38%, rgba(3, 7, 20, 0.72) 100%)',
          }}
        />

        {/* TOP-LEFT CORNER MICRO-TELEMETRY: 4 Stepped Horizontal Plane Bars (Ref 2) */}
        <div className="pointer-events-none absolute top-4 left-5 z-30 w-40 bg-[#030714]/75 backdrop-blur-md border border-white/[0.12] rounded-xl p-2.5 space-y-1.5">
          {[
            { label: 'ELA', pct: elaScorePct },
            { label: 'EAR', pct: earScorePct },
            { label: 'FFT', pct: fftScorePct },
            { label: 'ViT', pct: vitScorePct },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-[9px] font-mono-tabular text-white/60 w-6">
                {bar.label}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.08] rounded-sm overflow-hidden">
                <div
                  className="h-full transition-all duration-200 rounded-sm"
                  style={{
                    width: `${bar.pct}%`,
                    backgroundColor: bar.pct >= 55 ? '#F8FAFC' : '#FF6B00',
                  }}
                />
              </div>
              <span className="text-[9px] font-mono-tabular text-white/80 w-7 text-right">
                {bar.pct}%
              </span>
            </div>
          ))}
        </div>

        {/* TOP-RIGHT CORNER MICRO-TELEMETRY: 16-Bar Vertical Spectral Equalizer (Ref 2) */}
        <div className="pointer-events-none absolute top-4 right-5 z-30 bg-[#030714]/75 backdrop-blur-md border border-white/[0.12] rounded-xl px-3 py-2.5 flex flex-col items-end gap-1">
          <div className="flex items-end gap-[3px] h-10">
            {eqBands.map((val, idx) => {
              const heightPx = Math.round(val * 36);
              const isHighFreqSpike = idx > 10 && val > 0.55;
              return (
                <div
                  key={idx}
                  className="w-[3px] rounded-t-sm transition-all duration-150"
                  style={{
                    height: `${heightPx}px`,
                    backgroundColor: isHighFreqSpike
                      ? '#FF6B00'
                      : idx % 3 === 0
                      ? '#38BDF8'
                      : 'rgba(248, 250, 252, 0.78)',
                  }}
                />
              );
            })}
          </div>
          <span className="text-[8px] font-mono-tabular tracking-[0.18em] text-white/50 uppercase">
            2D-FFT SPECTRUM • F#{telemetry?.frame_index ?? 0}
          </span>
        </div>

        {/* BOTTOM-LEFT CORNER MICRO-TELEMETRY: Connected Node-Graph Sparkline + Barcode Pulse (Ref 2) */}
        <div className="pointer-events-none absolute bottom-4 left-5 z-30 bg-[#030714]/78 backdrop-blur-md border border-white/[0.12] rounded-xl p-2.5 w-48">
          <svg viewBox="0 0 156 46" className="w-full h-11 overflow-visible">
            <polyline
              fill="none"
              stroke={accentColor}
              strokeWidth="1.4"
              points={polylinePoints}
            />
            {nodeSamples.map((node, i) => (
              <g key={i}>
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="2.6"
                  fill="#030714"
                  stroke="#F8FAFC"
                  strokeWidth="1.4"
                />
                {i % 2 === 1 && (
                  <text
                    x={node.x}
                    y={node.y - 5}
                    textAnchor="middle"
                    fill="rgba(248,250,252,0.85)"
                    fontSize="7"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {node.pct}%
                  </text>
                )}
              </g>
            ))}
          </svg>

          {/* Vertical Barcode Pulse Waveform (|||||i|i||i| Synchronising...) */}
          <div className="mt-1 pt-1.5 border-t border-white/[0.08] flex items-center justify-between">
            <div className="flex items-center gap-[2px]">
              {[10, 6, 12, 5, 11, 8, 13, 6, 9, 12, 7, 10, 5, 11].map((h, i) => (
                <span
                  key={i}
                  className="w-[1.5px] bg-white/75 inline-block rounded-full"
                  style={{
                    height: `${h}px`,
                    opacity: i % 2 === 0 ? 0.85 : 0.4,
                  }}
                />
              ))}
            </div>
            <span className="text-[9px] font-mono-tabular text-white/70 tracking-wider">
              {isActive ? 'Synchronising...' : 'Standby...'}
            </span>
          </div>
        </div>

        {/* BOTTOM-RIGHT CORNER MICRO-TELEMETRY: 4 Tabular Monospace Index Rows (06 ⊖ ⊕) (Ref 2) */}
        <div className="pointer-events-none absolute bottom-4 right-5 z-30 bg-[#030714]/78 backdrop-blur-md border border-white/[0.12] rounded-xl px-3 py-2 space-y-1">
          {indexRows.map((row) => (
            <div
              key={row.code}
              className="flex items-center justify-end gap-2 text-[10px] font-mono-tabular text-white/80"
            >
              <span className="text-white/45">{row.label}</span>
              <span className="text-white font-semibold w-8 text-right">{row.val}</span>
              <span className="text-white/90 font-bold">{row.code}</span>
              <span className="text-white/50 text-[9px]">⊖</span>
              <span
                className="text-[9px]"
                style={{ color: isGenuine ? '#38BDF8' : '#FF6B00' }}
              >
                ⊕
              </span>
            </div>
          ))}
        </div>

        {/* Precision Corner-Reticle & Laser Scanline Overlay */}
        {isActive && (
          <FaceRoiOverlay
            isGenuine={isGenuine}
            eyeLandmarks={telemetry?.plane_b_ear.eye_landmarks}
            faceRoi={telemetry?.plane_b_ear.face_roi}
            seamDivergence={telemetry?.plane_a_ela.seam_divergence_detected}
          />
        )}

        {/* Inactive Camera State */}
        {!isActive && inputSource !== 'UPLOAD_VIDEO' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#030714]/90 backdrop-blur-md z-20">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.14] flex items-center justify-center mb-3">
              <CameraOff className="w-5 h-5 text-[#38BDF8]" />
            </div>
            <p className="text-sm font-semibold text-white tracking-wide">
              Optical Biometric Scanner Standby
            </p>
            <p className="text-xs text-white/55 mt-1 mb-4 text-center max-w-xs">
              Activate live sensor stream to engage multi-plane corner-reticle forensics.
            </p>
            <button
              onClick={onStartCamera}
              className="px-5 py-2 text-xs font-semibold text-[#030714] bg-white hover:bg-white/90 rounded-full transition-all cursor-pointer shadow-lg"
            >
              {isLoading ? 'Calibrating Optics...' : 'Initialize Optical Stream'}
            </button>
          </div>
        )}

        {/* Upload KYC Video Mode */}
        {inputSource === 'UPLOAD_VIDEO' && (
          <label className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#030714]/90 backdrop-blur-md z-20 cursor-pointer hover:bg-[#030714]/80 transition-colors">
            <UploadCloud className="w-9 h-9 text-[#38BDF8] mb-2" />
            <span className="text-sm font-semibold text-white">Drop KYC Video Stream</span>
            <span className="text-xs text-white/50 mt-1">MP4 / WebM • 640×480 @ 25 FPS</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}

        {/* Snapshot Confirmation Pill */}
        {snapshotTaken && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#030714]/95 text-[#38BDF8] border border-[#38BDF8]/50 text-xs px-4 py-1.5 rounded-full z-40 font-mono-tabular">
            FORENSIC FRAME EXPORTED
          </div>
        )}
      </div>

      {/* Bottom Scanner Control Strip */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#0B0E14]/90 border border-white/[0.09] rounded-2xl">
        <div className="flex items-center gap-3 text-xs font-mono-tabular text-white/60">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
            }}
          />
          <span>
            SESSION <strong className="text-white">{minStr}:{secStr}</strong>
          </span>
          <span className="text-white/25">|</span>
          <span>
            BLINKS <strong className="text-white">{telemetry?.plane_b_ear.blink_count ?? 0}</strong>
          </span>
          <span className="text-white/25">|</span>
          <span>
            RTT <strong className="text-white">{(telemetry?.fusion.latency_ms ?? 28).toFixed(1)}ms</strong>
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          {isActive && (
            <button
              onClick={onStopCamera}
              className="text-[11px] text-white/60 hover:text-white px-3 py-1 rounded-full border border-white/[0.1] hover:bg-white/[0.05] transition-colors cursor-pointer"
            >
              Pause Stream
            </button>
          )}

          <button
            onClick={handleSnapshot}
            className="px-3 py-1.5 text-xs text-white/80 bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <CameraIcon className="w-3.5 h-3.5 text-white/60" />
            <span>Capture Frame</span>
          </button>

          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-mono-tabular font-semibold ${
              isGenuine ? 'frosted-pill-cyan text-[#38BDF8]' : 'frosted-pill-amber text-[#FB923C]'
            }`}
          >
            {isGenuine ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#38BDF8]" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B00]" />
            )}
            <span>{verdict}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
