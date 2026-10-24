import React from 'react';
import { Camera, Upload, Sliders, ArrowUpRight } from 'lucide-react';
import type { InputSourceMode, SystemHealthStats, DeepGuardTelemetry } from '../../services/types';

interface HeaderBarProps {
  inputSource: InputSourceMode;
  onSelectInputSource: (mode: InputSourceMode) => void;
  healthStats?: SystemHealthStats;
  telemetry?: DeepGuardTelemetry | null;
}

/**
 * Generates a deterministic dot-matrix stippled biometric silhouette (Ref 3)
 */
const HalftoneBiometricSilhouette: React.FC<{ isGenuine: boolean }> = ({ isGenuine }) => {
  const rows = 20;
  const cols = 30;
  const dots: { cx: number; cy: number; r: number; opacity: number; highlight?: boolean }[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Normalized coordinates [-1, 1]
      const nx = (c / (cols - 1)) * 2 - 1;
      const ny = (r / (rows - 1)) * 2 - 1;

      // Sculptural head & shoulders profile + optical wave contour
      const headDist = Math.hypot((nx - 0.15) * 1.15, (ny + 0.18) * 1.35);
      const shoulderDist = Math.hypot((nx - 0.15) * 0.65, (ny - 0.72) * 1.1);
      const wave = Math.sin(nx * 4.2 + ny * 2.5) * 0.15;

      let intensity = 0;
      if (headDist < 0.62) {
        intensity = Math.cos((headDist / 0.62) * (Math.PI / 2));
      } else if (ny > 0.25 && shoulderDist < 0.78) {
        intensity = Math.cos((shoulderDist / 0.78) * (Math.PI / 2)) * 0.85;
      } else {
        const ring = Math.abs(headDist - 0.82 + wave);
        if (ring < 0.16) {
          intensity = (1 - ring / 0.16) * 0.42;
        }
      }

      if (intensity > 0.08) {
        const isEyeBand = Math.abs(ny + 0.24) < 0.09 && Math.abs(nx - 0.12) < 0.34;
        dots.push({
          cx: c * 11 + 8,
          cy: r * 9.5 + 8,
          r: Math.max(0.8, intensity * 2.45),
          opacity: isEyeBand ? Math.min(0.95, intensity + 0.35) : intensity * 0.52,
          highlight: isEyeBand,
        });
      }
    }
  }

  const accentColor = isGenuine ? '#38BDF8' : '#FF6B00';

  return (
    <svg
      viewBox="0 0 340 198"
      className="w-full h-full max-w-[360px] select-none pointer-events-none"
      aria-hidden="true"
    >
      {dots.map((d, idx) => (
        <circle
          key={idx}
          cx={d.cx}
          cy={d.cy}
          r={d.r}
          fill={d.highlight ? accentColor : '#F8FAFC'}
          fillOpacity={d.opacity}
        />
      ))}
    </svg>
  );
};

/**
 * Hybrid Macro-Eye + Camera Aperture Lens SVG Emblem (Ref 5)
 * Subtly dilates and rotates aperture blades based on real-time EAR telemetry.
 */
const OpticalApertureEyeEmblem: React.FC<{
  earRaw: number;
  isBlink: boolean;
  isGenuine: boolean;
}> = ({ earRaw, isBlink, isGenuine }) => {
  // Clamp EAR in [0.14, 0.36]
  const clampedEar = Math.max(0.14, Math.min(0.36, earRaw || 0.3));
  const normalizedOpen = (clampedEar - 0.14) / 0.22; // 0 when closed, 1 when wide open
  const pupilRadius = 11 + normalizedOpen * 7;
  const rotationDeg = Math.round(normalizedOpen * 28);
  const accentStroke = isBlink
    ? '#38BDF8'
    : isGenuine
    ? 'rgba(248, 250, 252, 0.88)'
    : '#FF6B00';

  return (
    <div className="relative flex items-center justify-center w-36 h-24">
      <svg viewBox="0 0 200 120" className="w-full h-full overflow-visible">
        <defs>
          <radialGradient id="lensIrisGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#05070B" />
            <stop offset="55%" stopColor="#111827" />
            <stop offset="85%" stopColor={isGenuine ? '#1E3A8A' : '#7C2D12'} stopOpacity="0.7" />
            <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.25" />
          </radialGradient>
        </defs>

        {/* Outer Macro-Eye Contours (Eyelid Arch + Lower Rim) */}
        <path
          d="M 14 62 Q 100 6 186 62 Q 100 116 14 62 Z"
          fill="rgba(8, 10, 15, 0.85)"
          stroke="rgba(255, 255, 255, 0.28)"
          strokeWidth="1.25"
        />
        <path
          d="M 24 62 Q 100 16 176 62"
          fill="none"
          stroke={accentStroke}
          strokeWidth="1.6"
          strokeDasharray="3 2"
        />

        {/* Camera Lens Barrel Outer Rings */}
        <circle
          cx="100"
          cy="62"
          r="39"
          fill="url(#lensIrisGrad)"
          stroke="rgba(255, 255, 255, 0.55)"
          strokeWidth="1.75"
        />
        <circle
          cx="100"
          cy="62"
          r="33"
          fill="none"
          stroke="rgba(255, 255, 255, 0.22)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {/* Rotating 6-Blade Camera Aperture */}
        <g
          transform={`translate(100, 62) rotate(${rotationDeg})`}
          style={{ transition: 'transform 120ms ease-out' }}
        >
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <g key={angle} transform={`rotate(${angle})`}>
              <line
                x1={pupilRadius}
                y1={-4}
                x2={29}
                y2={14}
                stroke="rgba(255, 255, 255, 0.45)"
                strokeWidth="1.35"
              />
            </g>
          ))}
        </g>

        {/* Dynamic Pupil Core */}
        <circle
          cx="100"
          cy="62"
          r={pupilRadius}
          fill="#020408"
          stroke={accentStroke}
          strokeWidth="1.75"
          style={{ transition: 'r 90ms ease-out' }}
        />

        {/* Optical Specular Catchlights */}
        <circle cx="92" cy="54" r="3.2" fill="#FFFFFF" fillOpacity="0.88" />
        <circle cx="107" cy="68" r="1.6" fill="#38BDF8" fillOpacity="0.75" />

        {/* Focal Millimeter Index Markings */}
        <text
          x="100"
          y="112"
          textAnchor="middle"
          fill="rgba(255,255,255,0.45)"
          fontSize="6.5"
          fontFamily="JetBrains Mono, monospace"
          letterSpacing="1.8"
        >
          F/1.4 • EAR {clampedEar.toFixed(2)}
        </text>
      </svg>
    </div>
  );
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  inputSource,
  onSelectInputSource,
  healthStats,
  telemetry,
}) => {
  const isGenuine = telemetry ? telemetry.fusion.is_genuine : true;
  const earRaw = telemetry ? telemetry.plane_b_ear.ear_raw : 0.31;
  const isBlink = telemetry ? telemetry.plane_b_ear.is_blink : false;
  const fps = telemetry ? telemetry.fps : healthStats?.fps || 25.0;

  return (
    <div className="w-full">
      {/* Top Institutional Hairline Navigation (Ref 3) */}
      <header className="w-full border-b border-white/[0.08] bg-[#0D0C0E]/92 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Institutional Status Dot + DeepGuard Wordmark */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  isGenuine
                    ? 'bg-[#EF4444] shadow-[0_0_10px_rgba(239,68,68,0.8)]'
                    : 'bg-[#FF6B00] shadow-[0_0_12px_rgba(255,107,0,0.9)]'
                }`}
              />
              <span className="font-semibold text-[15px] tracking-tight text-white">
                DeepGuard
              </span>
            </div>

            <nav className="hidden xl:flex items-center gap-6 text-xs text-white/60 font-medium">
              <span className="text-white/90 hover:text-white transition-colors cursor-default">
                Technology
              </span>
              <span className="hover:text-white transition-colors cursor-default">
                Multi-Plane CV
              </span>
              <span className="hover:text-white transition-colors cursor-default">
                Forensic Telemetry
              </span>
              <span className="hover:text-white transition-colors cursor-default">
                Architecture
              </span>
            </nav>
          </div>

          {/* Center: Input Source Segmented Switcher */}
          <div className="flex items-center p-1 bg-white/[0.03] border border-white/[0.09] rounded-full">
            <button
              onClick={() => onSelectInputSource('LIVE_WEBCAM')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                inputSource === 'LIVE_WEBCAM'
                  ? 'bg-white text-[#08090C] font-semibold shadow-sm'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Live Webcam</span>
            </button>

            <button
              onClick={() => onSelectInputSource('UPLOAD_VIDEO')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                inputSource === 'UPLOAD_VIDEO'
                  ? 'bg-white text-[#08090C] font-semibold shadow-sm'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload KYC Video</span>
            </button>

            <button
              onClick={() => onSelectInputSource('ATTACK_SIMULATOR')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full transition-all cursor-pointer ${
                inputSource === 'ATTACK_SIMULATOR'
                  ? 'bg-[#FF6B00] text-white font-semibold shadow-[0_0_16px_rgba(255,107,0,0.4)]'
                  : 'text-white/65 hover:text-white'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Synthetic Attack Simulator</span>
            </button>
          </div>

          {/* Right: Live Stream Badge & Institutional Pill CTA */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono-tabular text-[11px] text-white/75">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>WS 8000 • {fps.toFixed(1)} FPS</span>
            </div>
            <button
              onClick={() => onSelectInputSource('ATTACK_SIMULATOR')}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-white text-[#0D0C0E] text-xs font-semibold hover:bg-white/90 transition-colors cursor-pointer"
            >
              <span>Early Access</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Signature A + Signature B Editorial & Optical Manifesto Banner */}
      <section className="max-w-[1440px] mx-auto px-6 pt-5 pb-2">
        <div className="editorial-hero-surface rounded-[24px] overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            {/* Signature A (Ref 3): Editorial Serif + Dot-Matrix Halftone Hero (7 Cols) */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 border-b lg:border-b-0 lg:border-r border-white/[0.08] relative">
              <div className="space-y-3.5 max-w-md z-10">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-white/70">
                    DeepGuard Optical KYC • Frame Zero
                  </span>
                </div>

                <h1 className="font-editorial-serif text-4xl sm:text-[44px] leading-[1.04] tracking-[-0.01em] text-white font-normal">
                  Verifying human authenticity from frame zero.
                </h1>

                <p className="text-xs sm:text-[13px] text-white/60 leading-relaxed">
                  Real-time multi-plane forensic verification fusing Spatial ELA, Bilateral Ocular EAR, 2D-FFT Spectral Energy, and Neural ViT keyframes before synthetic artifacts breach your identity perimeter.
                </p>
              </div>

              {/* Right-aligned Dot-Matrix Halftone Biometric Silhouette */}
              <div className="w-full sm:w-56 h-36 sm:h-40 flex items-center justify-end shrink-0 opacity-95">
                <HalftoneBiometricSilhouette isGenuine={isGenuine} />
              </div>
            </div>

            {/* Signature B (Ref 5): Stark Optical-Lens Manifesto Strip ("We See Beyond The Obvious") (5 Cols) */}
            <div className="lg:col-span-5 p-6 sm:p-7 bg-[#08090C]/90 flex items-center justify-between gap-4 relative">
              <div className="flex flex-col justify-between h-full space-y-3">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-white/45">
                    OPTICAL FORENSIC MANIFESTO
                  </div>
                  <h2 className="font-geometric-display text-lg sm:text-xl font-bold uppercase tracking-[0.18em] text-white leading-snug">
                    WE SEE BEYOND THE OBVIOUS
                  </h2>
                </div>

                {/* Three-square geometric divider (▪ ▪ ▪) */}
                <div className="flex items-center gap-3 py-0.5" aria-hidden="true">
                  <span className="w-1.5 h-1.5 bg-white/85 inline-block" />
                  <span className="w-1.5 h-1.5 bg-white/85 inline-block" />
                  <span className="w-1.5 h-1.5 bg-white/85 inline-block" />
                  <span className="text-[10px] font-mono-tabular tracking-[0.2em] text-white/40 uppercase ml-1">
                    4-PLANE FUSION
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="font-geometric-display text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-white/90">
                    LOOKING DEEPER THAN MOST.
                  </div>
                  <p className="text-[11px] text-white/50 max-w-[250px] leading-relaxed">
                    Sub-pixel compression residuals &amp; ocular micro-blinks inspected at 25 FPS.
                  </p>
                </div>
              </div>

              {/* Center-Right: Hybrid Macro-Eye + Camera Aperture Emblem */}
              <div className="shrink-0 flex items-center gap-2">
                <OpticalApertureEyeEmblem
                  earRaw={earRaw}
                  isBlink={isBlink}
                  isGenuine={isGenuine}
                />

                {/* Vertical Rotated Edge Label (Ref 5) */}
                <div
                  className="hidden sm:block text-[9px] font-mono-tabular uppercase tracking-[0.24em] text-white/35 select-none pl-2 border-l border-white/[0.08]"
                  style={{ writingMode: 'vertical-rl' }}
                >
                  MULTI-PLANE OPTICAL FORENSICS • 25 FPS
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
