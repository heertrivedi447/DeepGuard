import React from 'react';
import type { EyeLandmark, FaceROI } from '../../services/types';

interface FaceRoiOverlayProps {
  isGenuine?: boolean;
  eyeLandmarks?: EyeLandmark[];
  faceRoi?: FaceROI;
  seamDivergence?: boolean;
}

export const FaceRoiOverlay: React.FC<FaceRoiOverlayProps> = ({
  isGenuine = true,
  eyeLandmarks = [],
  faceRoi,
  seamDivergence = false,
}) => {
  const accentColor = isGenuine ? '#38BDF8' : '#FF6B00';
  const bracketColor = isGenuine ? 'rgba(248, 250, 252, 0.92)' : '#FF6B00';

  // Convert normalized face ROI to SVG [0..640, 0..400] coordinate space
  const roiX = faceRoi ? Math.max(120, Math.min(260, faceRoi.x * 640)) : 195;
  const roiY = faceRoi ? Math.max(45, Math.min(130, faceRoi.y * 400)) : 65;
  const roiW = faceRoi ? Math.max(180, Math.min(290, faceRoi.width * 640)) : 250;
  const roiH = faceRoi ? Math.max(210, Math.min(295, faceRoi.height * 400)) : 270;

  const left = roiX;
  const right = roiX + roiW;
  const top = roiY;
  const bottom = roiY + roiH;
  const cornerLen = 28;

  // Pick anchor points for the circuit-trace callouts (Ref 2)
  const leftAnchor = eyeLandmarks.find((pt) => pt.eye === 'left' && pt.id === 'p1') || {
    x: 0.41,
    y: 0.42,
  };
  const rightAnchor = eyeLandmarks.find((pt) => pt.eye === 'right' && pt.id === 'p4') || {
    x: 0.59,
    y: 0.42,
  };

  const lx = leftAnchor.x * 640;
  const ly = leftAnchor.y * 400;
  const rx = rightAnchor.x * 640;
  const ry = rightAnchor.y * 400;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 select-none overflow-hidden">
      {/* Horizontal Laser Scanline with Opposing Triangular Arrowheads (Ref 2) */}
      <div
        className="laser-scanline-sweep absolute left-[18%] right-[18%] flex items-center justify-between z-25"
        style={{ height: '2px' }}
      >
        {/* Left inward arrowhead ► */}
        <span
          className="text-[10px] leading-none font-mono-tabular -ml-2"
          style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}` }}
        >
          ►
        </span>

        {/* Thin glowing laser beam */}
        <div
          className="flex-1 h-[1.5px] mx-1 relative"
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, #FFFFFF 50%, ${accentColor} 100%)`,
            boxShadow: `0 0 12px ${accentColor}, 0 0 24px ${accentColor}`,
          }}
        >
          <span
            className="absolute -top-4 right-8 text-[9px] font-mono-tabular tracking-[0.16em] uppercase px-1.5 py-0.5 rounded bg-[#030714]/85 border border-white/15"
            style={{ color: accentColor }}
          >
            Scanning...
          </span>
        </div>

        {/* Right inward arrowhead ◄ */}
        <span
          className="text-[10px] leading-none font-mono-tabular -mr-2"
          style={{ color: accentColor, textShadow: `0 0 8px ${accentColor}` }}
        >
          ◄
        </span>
      </div>

      {/* Main Precision Vector Reticle & 12 Eye Landmarks Overlay */}
      <svg viewBox="0 0 640 400" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <filter id="reticleGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3.5" floodColor={accentColor} floodOpacity="0.85" />
          </filter>
        </defs>

        {/* 1. Wide-Spaced Crisp 1.5px Corner L-Brackets around Face ROI (Ref 2) */}
        <g stroke={bracketColor} strokeWidth="1.6" fill="none" strokeLinecap="square">
          {/* Top-Left L-Bracket */}
          <path d={`M ${left} ${top + cornerLen} L ${left} ${top} L ${left + cornerLen} ${top}`} />
          {/* Top-Right L-Bracket */}
          <path d={`M ${right - cornerLen} ${top} L ${right} ${top} L ${right} ${top + cornerLen}`} />
          {/* Bottom-Left L-Bracket */}
          <path d={`M ${left} ${bottom - cornerLen} L ${left} ${bottom} L ${left + cornerLen} ${bottom}`} />
          {/* Bottom-Right L-Bracket */}
          <path d={`M ${right - cornerLen} ${bottom} L ${right} ${bottom} L ${right} ${bottom - cornerLen}`} />
        </g>

        {/* Subtle Inner Optical Frame & Crosshair Ticks */}
        <rect
          x={left + 10}
          y={top + 10}
          width={roiW - 20}
          height={roiH - 20}
          rx={18}
          fill="none"
          stroke={seamDivergence ? 'rgba(255, 107, 0, 0.45)' : 'rgba(56, 189, 248, 0.16)'}
          strokeWidth="1"
          strokeDasharray={seamDivergence ? '5 3' : '2 6'}
        />

        {/* 2. Normalized 12 Eye Landmark Points (p1..p6 left & right) */}
        {eyeLandmarks.map((pt, idx) => {
          const cx = pt.x * 640;
          const cy = pt.y * 400;
          return (
            <circle
              key={`${pt.eye}-${pt.id}-${idx}`}
              cx={cx}
              cy={cy}
              r="2.2"
              fill="#FFFFFF"
              stroke={accentColor}
              strokeWidth="1"
              filter="url(#reticleGlow)"
            />
          );
        })}

        {/* 3. Left Ocular Node Callout: ●─── Matched / Anomaly (Ref 2) */}
        <g>
          <circle cx={lx} cy={ly} r="4" fill={accentColor} filter="url(#reticleGlow)" />
          <circle cx={lx} cy={ly} r="7.5" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.6" />
          <polyline
            points={`${lx},${ly} ${lx - 26},${ly - 22} ${lx - 96},${ly - 22}`}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.2"
          />
          <rect
            x={lx - 100}
            y={ly - 40}
            width="76"
            height="16"
            rx="4"
            fill="rgba(3, 7, 20, 0.85)"
            stroke={accentColor}
            strokeWidth="0.8"
          />
          <text
            x={lx - 62}
            y={ly - 29}
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {isGenuine ? '● Matched' : '▲ Anomaly'}
          </text>
        </g>

        {/* 4. Right Facial/Ocular Node Callout: ●─── Matched / Seam Alert (Ref 2) */}
        <g>
          <circle cx={rx} cy={ry} r="4" fill={accentColor} filter="url(#reticleGlow)" />
          <circle cx={rx} cy={ry} r="7.5" fill="none" stroke={accentColor} strokeWidth="1" strokeOpacity="0.6" />
          <polyline
            points={`${rx},${ry} ${rx + 28},${ry + 28} ${rx + 104},${ry + 28}`}
            fill="none"
            stroke={accentColor}
            strokeWidth="1.2"
          />
          <rect
            x={rx + 30}
            y={ry + 10}
            width="78"
            height="16"
            rx="4"
            fill="rgba(3, 7, 20, 0.85)"
            stroke={accentColor}
            strokeWidth="0.8"
          />
          <text
            x={rx + 69}
            y={ry + 21}
            textAnchor="middle"
            fill="#F8FAFC"
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
          >
            {isGenuine ? '● Matched' : '▲ Mismatch'}
          </text>
        </g>
      </svg>
    </div>
  );
};
