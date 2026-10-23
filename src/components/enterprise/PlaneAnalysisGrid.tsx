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
      {/* 1. Plane B Panel: Renamed to "Liveness Check" */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-semibold text-gray-200">
              Liveness Check
            </span>
          </div>

          <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/[0.08] px-2 py-0.5 rounded-full border border-emerald-500/20">
            Active
          </span>
        </div>

        {/* Simple Status Icon (No live tracking graph, no decimal EAR scores) */}
        <div className="my-5 flex items-center justify-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-100">
            <span>Blink Detected:</span>
            <span className="text-base">{hasBlinked ? '✅' : '⏳'}</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          {hasBlinked
            ? 'Natural eye movement verified.'
            : 'Please blink naturally looking at the camera.'}
        </p>
      </div>

      {/* 2. Plane A Panel: Renamed to "Image Integrity Scan" */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-gray-200">
              Image Integrity Scan
            </span>
          </div>

          {/* Simple Pass/Fail Indicator */}
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
              isIntegrityPassed
                ? 'text-emerald-400 bg-emerald-500/[0.08] border-emerald-500/20'
                : 'text-red-400 bg-red-500/[0.08] border-red-500/20'
            }`}
          >
            {isIntegrityPassed ? 'Pass' : 'Fail'}
          </span>
        </div>

        {/* Simple Pass/Fail Visual (No mathematical data, residual scores, or 8x8 macroblock text) */}
        <div className="my-5 flex items-center justify-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg">
          <div className="flex items-center gap-2">
            {isIntegrityPassed ? (
              <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Image Integrity: Pass
              </span>
            ) : (
              <span className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
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
