import React from 'react';
import { motion } from 'framer-motion';
import { Eye, ShieldCheck, AlertCircle } from 'lucide-react';
import type {
  PlaneA_ELA,
  PlaneB_EAR,
  PlaneC_FFT,
  AuxiliaryNeural,
} from '../../services/types';

interface PlaneAnalysisGridProps {
  planeA?: PlaneA_ELA;
  planeB?: PlaneB_EAR;
  planeC?: PlaneC_FFT; // Calculations run silently in backend, UI hidden
  neural?: AuxiliaryNeural;
}

export const PlaneAnalysisGrid: React.FC<PlaneAnalysisGridProps> = ({
  planeA,
  planeB,
}) => {
  // Plane B: Liveness Check (EAR)
  const isBlinking = planeB?.is_blink ?? false;
  const blinkCount = planeB?.blink_count ?? 0;
  const hasBlinked = blinkCount > 0 || isBlinking;

  // Plane A: Image Integrity Scan (ELA)
  const elaAnomaly = planeA?.ela_anomaly ?? 0.12;
  const macroblockOk = planeA?.macroblock_consistency ?? true;
  const isIntegrityPassed = elaAnomaly <= 0.5 && macroblockOk;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* 1. Plane B Panel: "Liveness Check" (Staggered fade-up & scale-in) */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="relative frosted-glass-card rounded-[18px] p-4 flex flex-col justify-between shadow-lg overflow-hidden"
      >
        {/* Faint Background Micro-Text & Minimal Cyber Node */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
          <div className="absolute top-2 right-3 text-[8px] font-mono tracking-widest text-[#0097A7]/25 uppercase">
            SYNC 34% // EAR_B
          </div>
          <div className="absolute bottom-2 left-3 text-[8px] font-mono tracking-widest text-[#1E3A8A]/35 uppercase">
            OCULAR_DELTA: 0.04
          </div>
          <div className="absolute top-1/2 right-3 flex items-center gap-1 opacity-20">
            <span className="w-1 h-1 rounded-full bg-[#0097A7] animate-ping" />
            <span className="text-[7px] font-mono text-[#0097A7]">0x4B</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#0097A7]/15 border border-[#0097A7]/30 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-[#0097A7]" />
            </div>
            <span className="text-xs font-semibold text-gray-200">
              Liveness Check
            </span>
          </div>

          <span className="text-[10px] font-medium font-mono text-[#0097A7] bg-[#0097A7]/10 px-2 py-0.5 rounded-full border border-[#0097A7]/25 shadow-[0_0_8px_rgba(0,151,167,0.2)]">
            ACTIVE NODE
          </span>
        </div>

        {/* Status in Frosted Pill */}
        <div className="relative z-10 my-4 flex items-center justify-center p-3 bg-[#0B0F17]/80 border border-white/[0.07] rounded-xl shadow-inner">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span>Blink Detected:</span>
            <span className="text-base">{hasBlinked ? '✅' : '⏳'}</span>
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-gray-400">
          {hasBlinked
            ? 'Natural biological liveness confirmed.'
            : 'Please blink naturally facing the scanner.'}
        </p>
      </motion.div>

      {/* 2. Plane A Panel: "Image Integrity Scan" (Breathing glow on status badge) */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="relative frosted-glass-card rounded-[18px] p-4 flex flex-col justify-between shadow-lg overflow-hidden"
      >
        {/* Faint Background Micro-Text & Minimal Cyber Node */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
          <div className="absolute top-2 right-3 text-[8px] font-mono tracking-widest text-[#0097A7]/25 uppercase">
            SYNC 78% // ELA_A
          </div>
          <div className="absolute bottom-2 left-3 text-[8px] font-mono tracking-widest text-[#1E3A8A]/35 uppercase">
            Q90_RESIDUAL: OPTIMAL
          </div>
          <div className="absolute top-1/2 right-3 flex items-center gap-1 opacity-20">
            <span className="w-1 h-1 rounded-full bg-[#1E3A8A] animate-ping" />
            <span className="text-[7px] font-mono text-[#0097A7]">0x1A</span>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-[#1E3A8A]/30 border border-[#0097A7]/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0097A7]" />
            </div>
            <span className="text-xs font-semibold text-gray-200">
              Image Integrity Scan
            </span>
          </div>

          {/* Soft Breathing Glow matching Teal/Indigo palette on Image Integrity Scan status badge */}
          <motion.span
            animate={{
              boxShadow: isIntegrityPassed
                ? [
                    '0 0 6px rgba(0, 151, 167, 0.3), 0 0 12px rgba(30, 58, 138, 0.2)',
                    '0 0 18px rgba(0, 151, 167, 0.75), 0 0 28px rgba(30, 58, 138, 0.45)',
                    '0 0 6px rgba(0, 151, 167, 0.3), 0 0 12px rgba(30, 58, 138, 0.2)',
                  ]
                : [
                    '0 0 6px rgba(234, 179, 8, 0.3), 0 0 12px rgba(239, 68, 68, 0.2)',
                    '0 0 18px rgba(234, 179, 8, 0.75), 0 0 28px rgba(239, 68, 68, 0.45)',
                    '0 0 6px rgba(234, 179, 8, 0.3), 0 0 12px rgba(239, 68, 68, 0.2)',
                  ],
              borderColor: isIntegrityPassed
                ? ['rgba(0, 151, 167, 0.4)', 'rgba(0, 151, 167, 0.85)', 'rgba(0, 151, 167, 0.4)']
                : ['rgba(234, 179, 8, 0.4)', 'rgba(234, 179, 8, 0.85)', 'rgba(234, 179, 8, 0.4)'],
            }}
            transition={{
              duration: 2.8,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className={`text-[10px] font-semibold font-mono px-2.5 py-0.5 rounded-full border transition-all ${
              isIntegrityPassed
                ? 'text-[#0097A7] bg-[#0097A7]/10 border-[#0097A7]/30'
                : 'text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/30'
            }`}
          >
            {isIntegrityPassed ? 'PASS' : 'FAIL'}
          </motion.span>
        </div>

        {/* Pass/Fail Pill */}
        <div className="relative z-10 my-4 flex items-center justify-center p-3 bg-[#0B0F17]/80 border border-white/[0.07] rounded-xl shadow-inner">
          <div className="flex items-center gap-2">
            {isIntegrityPassed ? (
              <span className="text-sm font-semibold text-[#0097A7] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0097A7]" />
                Image Integrity: Pass
              </span>
            ) : (
              <span className="text-sm font-semibold text-[#EAB308] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#EAB308]" />
                Image Integrity: Fail
              </span>
            )}
          </div>
        </div>

        <p className="relative z-10 text-[11px] text-gray-400">
          {isIntegrityPassed
            ? 'Spatial and boundary compression verified clean.'
            : 'Pixel splice detected. Ensure balanced lighting.'}
        </p>
      </motion.div>

      {/* Plane C Panel (Spectral Purity) remains completely hidden from visual layout */}
    </div>
  );
};
