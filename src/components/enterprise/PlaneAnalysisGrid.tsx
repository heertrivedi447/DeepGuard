import React from 'react';
import type {
  PlaneA_ELA,
  PlaneB_EAR,
  PlaneC_FFT,
  AuxiliaryNeural,
} from '../../services/types';

interface PlaneAnalysisGridProps {
  planeA?: PlaneA_ELA;
  planeB?: PlaneB_EAR;
  planeC?: PlaneC_FFT;
  neural?: AuxiliaryNeural;
}

/**
 * Card 1 3D Visual (Ref 1 "Security"):
 * Isometric 3D Segmented Dark-Glass Rubik's Cube with Sub-Surface Cobalt-Blue Glowing Sub-Cubes
 */
const SegmentedObsidianCubeSVG: React.FC<{
  grid: number[];
  isSeamAlert: boolean;
}> = ({ grid, isSeamAlert }) => {
  const glowColor = isSeamAlert ? '#FF6B00' : '#3B82F6';
  const brightGlow = isSeamAlert ? '#FDBA74' : '#60A5FA';

  // Helper to draw an isometric sub-cube at (cx, cy) with size s
  const renderIsoSubCube = (
    cx: number,
    cy: number,
    s: number,
    intensity: number,
    key: string
  ) => {
    const dx = s * 0.866;
    const dy = s * 0.5;
    const isLit = intensity > 0.24;

    const topFace = `M ${cx} ${cy - s} L ${cx + dx} ${cy - dy} L ${cx} ${cy} L ${cx - dx} ${cy - dy} Z`;
    const leftFace = `M ${cx - dx} ${cy - dy} L ${cx} ${cy} L ${cx} ${cy + s} L ${cx - dx} ${cy + dy} Z`;
    const rightFace = `M ${cx} ${cy} L ${cx + dx} ${cy - dy} L ${cx + dx} ${cy + dy} L ${cx} ${cy + s} Z`;

    return (
      <g key={key}>
        {/* Sub-surface internal cobalt core glow */}
        {isLit && (
          <circle
            cx={cx}
            cy={cy}
            r={s * 0.95}
            fill={glowColor}
            fillOpacity={Math.min(0.65, intensity * 0.9)}
            filter="url(#cobaltSubGlow)"
          />
        )}
        {/* Top Face */}
        <path
          d={topFace}
          fill={isLit ? glowColor : '#121722'}
          fillOpacity={isLit ? 0.55 : 0.92}
          stroke={isLit ? brightGlow : 'rgba(255,255,255,0.22)'}
          strokeWidth="1"
        />
        {/* Left Face */}
        <path
          d={leftFace}
          fill={isLit ? '#1D4ED8' : '#0B0E17'}
          fillOpacity={isLit ? 0.65 : 0.95}
          stroke={isLit ? brightGlow : 'rgba(255,255,255,0.16)'}
          strokeWidth="1"
        />
        {/* Right Face */}
        <path
          d={rightFace}
          fill={isLit ? '#0F2942' : '#06080D'}
          fillOpacity={isLit ? 0.78 : 0.98}
          stroke={isLit ? glowColor : 'rgba(255,255,255,0.12)'}
          strokeWidth="1"
        />
      </g>
    );
  };

  // Back-to-front isometric lattice positions for a 3D segmented cube cluster
  const positions = [
    { x: 110, y: 66, s: 18 },
    { x: 88, y: 78, s: 18 },
    { x: 132, y: 78, s: 18 },
    { x: 66, y: 91, s: 18 },
    { x: 110, y: 91, s: 19 },
    { x: 154, y: 91, s: 18 },
    { x: 88, y: 104, s: 19 },
    { x: 132, y: 104, s: 19 },
    { x: 110, y: 118, s: 20 },
    { x: 88, y: 128, s: 18 },
    { x: 132, y: 128, s: 18 },
    { x: 110, y: 141, s: 19 },
  ];

  return (
    <svg viewBox="0 0 220 200" className="w-48 h-44 overflow-visible select-none">
      <defs>
        <filter id="cobaltSubGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="8" result="blur" />
        </filter>
      </defs>

      {/* Ambient Cobalt Backlight */}
      <circle
        cx="110"
        cy="104"
        r="54"
        fill={glowColor}
        fillOpacity="0.22"
        filter="url(#cobaltSubGlow)"
      />

      {positions.map((pos, idx) => {
        const val = grid[idx % grid.length] ?? (idx % 3 === 0 ? 0.55 : 0.15);
        return renderIsoSubCube(pos.x, pos.y, pos.s, val, `cube-${idx}`);
      })}
    </svg>
  );
};

/**
 * Card 2 3D Visual (Ref 1 "Analysis"):
 * Sculptural 3D Stacked Metallic Cylinder Rings with Pulsing Electric-Sapphire Light Bands
 */
const StackedMetallicCylindersSVG: React.FC<{
  highPassEnergy: number;
  checkerboardDetected: boolean;
}> = ({ highPassEnergy, checkerboardDetected }) => {
  const bandColor = checkerboardDetected ? '#FF6B00' : '#3B82F6';
  const coreCyan = checkerboardDetected ? '#FDBA74' : '#60A5FA';

  const rings = [0, 1, 2, 3, 4];

  return (
    <svg viewBox="0 0 220 200" className="w-48 h-44 overflow-visible select-none">
      <defs>
        <linearGradient id="obsidianRingMetal" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#05070B" />
          <stop offset="28%" stopColor="#1E2638" />
          <stop offset="52%" stopColor="#0B0F19" />
          <stop offset="78%" stopColor="#263248" />
          <stop offset="100%" stopColor="#05070B" />
        </linearGradient>
        <filter id="sapphireSlotGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Internal Vertical Light Core */}
      <ellipse
        cx="110"
        cy="102"
        rx="44"
        ry="62"
        fill={bandColor}
        fillOpacity={0.18 + Math.min(0.35, highPassEnergy)}
        filter="url(#sapphireSlotGlow)"
      />

      {/* Render stacked tilted 3D cylinder rings from bottom to top */}
      {[...rings].reverse().map((rIdx) => {
        const cy = 54 + rIdx * 23;
        const isActiveSlot = rIdx === 1 || rIdx === 2 || rIdx === 3;
        return (
          <g key={rIdx} transform="rotate(-14 110 100)">
            {/* Glowing Horizontal Sapphire Light Band between metallic rings */}
            {isActiveSlot && (
              <ellipse
                cx="110"
                cy={cy + 9}
                rx="52"
                ry="14"
                fill="none"
                stroke={coreCyan}
                strokeWidth="3.2"
                filter="url(#sapphireSlotGlow)"
              />
            )}

            {/* Thick 3D Metallic Cylinder Side Wall */}
            <path
              d={`M 54 ${cy} A 56 15 0 0 0 166 ${cy} L 166 ${cy + 12} A 56 15 0 0 1 54 ${cy + 12} Z`}
              fill="url(#obsidianRingMetal)"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="0.9"
            />

            {/* Cylinder Top Rim */}
            <ellipse
              cx="110"
              cy={cy}
              rx="56"
              ry="15"
              fill="#0A0E17"
              stroke={isActiveSlot ? coreCyan : 'rgba(255,255,255,0.28)'}
              strokeWidth={isActiveSlot ? '1.5' : '1'}
            />

            {/* Inner Bore Hole */}
            <ellipse
              cx="110"
              cy={cy}
              rx="32"
              ry="8"
              fill="#030508"
              stroke={bandColor}
              strokeWidth="1"
              strokeOpacity="0.65"
            />
          </g>
        );
      })}
    </svg>
  );
};

/**
 * Card 3 3D Visual (Ref 1 "Network"):
 * Sculptural 3D Contoured Biometric Fingerprint with Sub-Surface Electric Blue Rim Lighting
 */
const SculpturalBiometricFingerprintSVG: React.FC<{
  isBlink: boolean;
  livenessScore: number;
}> = ({ isBlink, livenessScore }) => {
  const isHealthy = livenessScore >= 0.45;
  const primaryGlow = !isHealthy ? '#FF6B00' : isBlink ? '#38BDF8' : '#3B82F6';
  const rimHighlight = !isHealthy ? '#FDBA74' : '#93C5FD';

  const ridgeRadii = [14, 23, 32, 41, 50, 59];

  return (
    <svg viewBox="0 0 220 200" className="w-48 h-44 overflow-visible select-none">
      <defs>
        <filter id="fingerprintGlow" x="-35%" y="-35%" width="170%" height="170%">
          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor={primaryGlow} floodOpacity="0.85" />
        </filter>
      </defs>

      {/* Deep Sub-Surface Electric Blue Radial Glow */}
      <ellipse
        cx="110"
        cy="102"
        rx="54"
        ry="66"
        fill={primaryGlow}
        fillOpacity={isBlink ? 0.34 : 0.2}
        style={{ filter: 'blur(16px)', transition: 'fill-opacity 150ms ease' }}
      />

      {/* Tilted 3D Sculptural Fingerprint Ridge Contours */}
      <g transform="rotate(-12 110 102)">
        {ridgeRadii.map((r, idx) => {
          const ry = r * 1.24;
          const dashArray =
            idx % 2 === 0
              ? `${r * 1.6} ${r * 0.35} ${r * 1.1} ${r * 0.4}`
              : `${r * 1.2} ${r * 0.4} ${r * 1.8} ${r * 0.3}`;
          return (
            <g key={r}>
              {/* Dark extruded 3D ridge shadow */}
              <ellipse
                cx="113"
                cy="105"
                rx={r}
                ry={ry}
                fill="none"
                stroke="#030407"
                strokeWidth="5.5"
                strokeDasharray={dashArray}
                strokeLinecap="round"
              />
              {/* Glowing cobalt/cyan specular top ridge */}
              <ellipse
                cx="110"
                cy="102"
                rx={r}
                ry={ry}
                fill="none"
                stroke={idx % 2 === 0 ? rimHighlight : primaryGlow}
                strokeWidth="2.6"
                strokeDasharray={dashArray}
                strokeLinecap="round"
                filter="url(#fingerprintGlow)"
              />
            </g>
          );
        })}

        {/* Central Biometric Core Loop */}
        <path
          d="M 104 112 C 104 92, 116 92, 116 112"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="2.5"
          strokeLinecap="round"
          filter="url(#fingerprintGlow)"
        />
      </g>
    </svg>
  );
};

export const PlaneAnalysisGrid: React.FC<PlaneAnalysisGridProps> = ({
  planeA,
  planeB,
  planeC,
  neural,
}) => {
  const elaGrid = planeA?.residualIntensityGrid ?? [
    0.12, 0.28, 0.15, 0.42, 0.18, 0.31, 0.25, 0.14, 0.38, 0.22, 0.19, 0.29,
  ];
  const isSeamAlert = planeA?.seam_divergence_detected ?? false;
  const elaAnomalyPct = Math.round((planeA?.ela_anomaly ?? 0.08) * 100);

  const highPassEnergy = planeC?.high_pass_energy ?? 0.22;
  const checkerboardDetected = planeC?.checkerboard_detected ?? false;
  const fftAnomalyPct = Math.round((planeC?.fft_anomaly ?? 0.09) * 100);

  const isBlink = planeB?.is_blink ?? false;
  const livenessScore = planeB?.liveness_score ?? 0.94;
  const vitProbPct = Math.round((neural?.neural_fake_prob ?? 0.04) * 100);

  const cards = [
    {
      id: 'security-ela',
      title: 'Security',
      planeTag: 'PLANE A • SPATIAL ELA (Q=90)',
      metricPrimary: `${100 - elaAnomalyPct}% Integrity`,
      metricSecondary: isSeamAlert ? 'Seam Divergence' : 'Macroblocks Clean',
      isAlert: isSeamAlert || elaAnomalyPct > 40,
      visual: <SegmentedObsidianCubeSVG grid={elaGrid} isSeamAlert={isSeamAlert} />,
    },
    {
      id: 'analysis-fft',
      title: 'Analysis',
      planeTag: 'PLANE C • 2D-FFT SPECTRUM',
      metricPrimary: `HPF ${(highPassEnergy * 100).toFixed(1)}%`,
      metricSecondary: checkerboardDetected ? 'GAN Grid Detected' : `Spectral Drift ${fftAnomalyPct}%`,
      isAlert: checkerboardDetected || fftAnomalyPct > 40,
      visual: (
        <StackedMetallicCylindersSVG
          highPassEnergy={highPassEnergy}
          checkerboardDetected={checkerboardDetected}
        />
      ),
    },
    {
      id: 'network-ear-vit',
      title: 'Network',
      planeTag: 'PLANE B + AUX • EAR & ViT',
      metricPrimary: `Liveness ${Math.round(livenessScore * 100)}%`,
      metricSecondary: `ViT Synth Risk ${vitProbPct}%`,
      isAlert: livenessScore < 0.45 || vitProbPct > 45,
      visual: (
        <SculpturalBiometricFingerprintSVG
          isBlink={isBlink}
          livenessScore={livenessScore}
        />
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {cards.map((card, idx) => (
        <div
          key={card.id}
          className="obsidian-bento-card p-6 flex flex-col justify-between min-h-[340px] relative overflow-hidden group"
        >
          {/* Top Row: Editorial Card Title + Top-Right 3-Line Menu Icon (Ref 1) */}
          <div className="flex items-start justify-between z-10">
            <div>
              <h3 className="text-xl font-medium tracking-tight text-white">
                {card.title}
              </h3>
              <p className="text-[10px] font-mono-tabular uppercase tracking-[0.18em] text-white/45 mt-0.5">
                {card.planeTag}
              </p>
            </div>

            {/* Minimalist 3-Line Hamburger Icon from Ref 1 */}
            <div className="flex flex-col gap-[4px] pt-1.5 opacity-65 group-hover:opacity-100 transition-opacity">
              <span className="w-4 h-[1.5px] bg-white rounded-full" />
              <span className="w-4 h-[1.5px] bg-white rounded-full" />
              <span className="w-4 h-[1.5px] bg-white rounded-full" />
            </div>
          </div>

          {/* Center Stage: Sculptural Sub-Surface Cobalt 3D Visual (Ref 1) */}
          <div className="my-2 flex items-center justify-center relative z-10">
            {card.visual}
          </div>

          {/* Bottom Row: Live Telemetry Readout + 3-Dot Indicator (Ref 1) */}
          <div className="z-10 space-y-3">
            <div className="flex items-center justify-between text-xs border-t border-white/[0.08] pt-3">
              <span className="font-mono-tabular font-semibold text-white/90">
                {card.metricPrimary}
              </span>
              <span
                className={`text-[11px] font-mono-tabular ${
                  card.isAlert ? 'text-[#FF6B00] font-semibold' : 'text-[#60A5FA]'
                }`}
              >
                {card.metricSecondary}
              </span>
            </div>

            {/* Bottom Centered 3-Dot Indicator from Ref 1 */}
            <div className="flex items-center justify-center gap-1.5 pt-0.5">
              {[0, 1, 2].map((dotIdx) => (
                <span
                  key={dotIdx}
                  className={`rounded-full transition-all ${
                    dotIdx === idx
                      ? 'w-1.5 h-1.5 bg-white'
                      : 'w-1 h-1 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
