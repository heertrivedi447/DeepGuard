import React from 'react';
import { motion } from 'framer-motion';

interface FaceRoiOverlayProps {
  isGenuine?: boolean;
}

export const FaceRoiOverlay: React.FC<FaceRoiOverlayProps> = ({ isGenuine = true }) => {
  const primaryColor = isGenuine ? '#0097A7' : '#EAB308';
  const glowColor = isGenuine ? 'rgba(0, 151, 167, 0.65)' : 'rgba(234, 179, 8, 0.65)';

  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Central Biometric Cyber HUD Reticle */}
      <div className="relative w-[54%] max-w-[280px] aspect-[3/4] flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 320 420"
          className="w-full h-full overflow-visible"
          fill="none"
        >
          <defs>
            <filter id="tealGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={primaryColor} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* 1. Geometric Targeting Brackets (Cyber L-Angles) */}
          {/* Top-Left */}
          <path
            d="M 45 80 L 45 45 L 80 45"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#tealGlow)"
          />
          {/* Top-Right */}
          <path
            d="M 240 45 L 275 45 L 275 80"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#tealGlow)"
          />
          {/* Bottom-Left */}
          <path
            d="M 45 340 L 45 375 L 80 375"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#tealGlow)"
          />
          {/* Bottom-Right */}
          <path
            d="M 240 375 L 275 375 L 275 340"
            stroke={primaryColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            filter="url(#tealGlow)"
          />

          {/* 2. Biometric Facial Contour Outline */}
          <ellipse
            cx="160"
            cy="205"
            rx="105"
            ry="145"
            stroke={primaryColor}
            strokeWidth="1.75"
            strokeDasharray="8 6"
            className="transition-colors duration-500"
            style={{
              filter: `drop-shadow(0 0 10px ${glowColor})`,
            }}
          />

          {/* Inner subtle biometric guide ring */}
          <ellipse
            cx="160"
            cy="205"
            rx="97"
            ry="135"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />

          {/* 3. Minimal Reticle Crosshair Ticks */}
          {/* Top marker */}
          <line x1="160" y1="36" x2="160" y2="52" stroke={primaryColor} strokeWidth="2" />
          {/* Bottom marker */}
          <line x1="160" y1="358" x2="160" y2="374" stroke={primaryColor} strokeWidth="2" />
          {/* Left marker */}
          <line x1="36" y1="205" x2="52" y2="205" stroke={primaryColor} strokeWidth="2" />
          {/* Right marker */}
          <line x1="268" y1="205" x2="284" y2="205" stroke={primaryColor} strokeWidth="2" />

          {/* Eye Level Alignment Reference Line */}
          <line
            x1="85"
            y1="175"
            x2="235"
            y2="175"
            stroke={isGenuine ? 'rgba(0, 151, 167, 0.25)' : 'rgba(234, 179, 8, 0.25)'}
            strokeWidth="1"
            strokeDasharray="4 4"
          />

          {/* Mouth Level Alignment Reference Line */}
          <line
            x1="110"
            y1="275"
            x2="210"
            y2="275"
            stroke={isGenuine ? 'rgba(0, 151, 167, 0.20)' : 'rgba(234, 179, 8, 0.20)'}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </svg>

        {/* Pulsing Concentric Outer Radar Arc (Framer Motion) */}
        <motion.div
          className="absolute inset-0 rounded-full border border-[#0097A7]/20 pointer-events-none"
          animate={{
            scale: [1, 1.05, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Friendly Instructional Frosted Pill with Cyber Status Node */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-center">
          <div className="flex items-center gap-2 bg-[#0D121D]/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-[#0097A7]/30 shadow-[0_0_12px_rgba(0,151,167,0.25)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0097A7] animate-pulse shadow-[0_0_6px_#0097A7]" />
            <span className="text-xs font-medium tracking-wide text-gray-200">
              Position your face here.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
