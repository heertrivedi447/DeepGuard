import React from 'react';
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
      {/* 1. Plane B Panel: "Liveness Check" (Electric Violet Accent from Reference 5) */}
      <div className="bg-[#12141A] border border-white/[0.08] rounded-[16px] p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#9333EA]/10 border border-[#9333EA]/30 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <span className="text-xs font-semibold text-gray-200">
              Liveness Check
            </span>
          </div>

          <span className="text-[11px] font-medium text-violet-400 bg-violet-500/[0.08] px-2 py-0.5 rounded-full border border-violet-500/20">
            Active
          </span>
        </div>

        {/* Simple Status Icon in Frosted Pill (Inspired by Reference Image 4) */}
        <div className="my-5 flex items-center justify-center p-3.5 bg-[#171922] border border-white/[0.06] rounded-xl shadow-inner">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span>Blink Detected:</span>
            <span className="text-base">{hasBlinked ? '✅' : '⏳'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          {hasBlinked
            ? 'Natural ocular liveness confirmed.'
            : 'Please blink naturally looking at the camera.'}
        </p>
      </div>

      {/* 2. Plane A Panel: "Image Integrity Scan" (Vibrant Coral Accent from Reference 5) */}
      <div className="bg-[#12141A] border border-white/[0.08] rounded-[16px] p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#FF5733]/10 border border-[#FF5733]/30 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B4A]" />
            </div>
            <span className="text-xs font-semibold text-gray-200">
              Image Integrity Scan
            </span>
          </div>

          {/* Simple Pass/Fail Badge */}
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              isIntegrityPassed
                ? 'text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20'
                : 'text-[#FF6B4A] bg-[#FF5733]/[0.08] border-[#FF5733]/20'
            }`}
          >
            {isIntegrityPassed ? 'Pass' : 'Fail'}
          </span>
        </div>

        {/* Simple Pass/Fail Pill Chip */}
        <div className="my-5 flex items-center justify-center p-3.5 bg-[#171922] border border-white/[0.06] rounded-xl shadow-inner">
          <div className="flex items-center gap-2">
            {isIntegrityPassed ? (
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Image Integrity: Pass
              </span>
            ) : (
              <span className="text-sm font-semibold text-[#FF6B4A] flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-[#FF6B4A]" />
                Image Integrity: Fail
              </span>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          {isIntegrityPassed
            ? 'No signs of digital tampering or face splicing.'
            : 'Image alteration detected. Please ensure clean lighting.'}
        </p>
      </div>

      {/* Plane C Panel (Spectral Purity) is completely hidden from visual layout */}
    </div>
  );
};
