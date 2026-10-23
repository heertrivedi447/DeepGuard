import React from 'react';
import { EarSparkline } from './EarSparkline';
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

export const PlaneAnalysisGrid: React.FC<PlaneAnalysisGridProps> = ({
  planeA,
  planeB,
  planeC,
  neural,
}) => {
  // Plane B: EAR
  const earRaw = planeB?.ear_raw ?? 0.292;
  const isBlinking = planeB?.is_blink ?? false;
  const earHistory = planeB?.ear_history ?? Array(30).fill(0.29);
  const livenessScore = planeB?.liveness_score ?? 0.96;
  const blinkCount = planeB?.blink_count ?? 6;

  // Plane A: ELA
  const elaAnomaly = planeA?.ela_anomaly ?? 0.12;
  const q90Residual = planeA?.q90_residual ?? 0.038;
  const macroblockOk = planeA?.macroblock_consistency ?? true;

  // Plane C: FFT
  const fftAnomaly = planeC?.fft_anomaly ?? 0.08;
  const highPassEnergy = planeC?.high_pass_energy ?? 0.18;
  const checkerboardDetected = planeC?.checkerboard_detected ?? false;

  // Auxiliary Neural
  const neuralFakeProb = neural?.neural_fake_prob ?? 0.04;
  const isCached = neural?.cached ?? true;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {/* 1. Plane B: Physiological Liveness (EAR) */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-400">
              Plane B — Biological (EAR)
            </span>
            <div className="flex items-center gap-1.5">
              {isBlinking && (
                <span className="text-[10px] font-mono-tabular font-medium text-amber-400 bg-amber-400/10 px-1.5 py-0.2 rounded border border-amber-400/20">
                  BLINK
                </span>
              )}
              <span className="text-[10px] font-mono-tabular text-gray-400">
                {blinkCount} blinks
              </span>
            </div>
          </div>

          <div className="mt-2 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1 font-mono-tabular">
              <span
                className={`text-xl font-semibold ${
                  earRaw < 0.22 ? 'text-amber-400' : 'text-gray-100'
                }`}
              >
                {earRaw.toFixed(3)}
              </span>
              <span className="text-xs text-gray-400">EAR</span>
            </div>

            <div className="text-right text-[11px] font-mono-tabular text-gray-400">
              Liveness: <strong className="text-emerald-400 font-medium">{(livenessScore * 100).toFixed(0)}%</strong>
            </div>
          </div>
        </div>

        {/* Minimalist 30-frame rolling SVG sparkline with 0.22 threshold line */}
        <div className="mt-2 pt-1 border-t border-white/[0.04]">
          <EarSparkline
            history={earHistory}
            threshold={0.22}
            currentVal={earRaw}
            isBlinking={isBlinking}
          />
        </div>
      </div>

      {/* 2. Plane A: Spatial Integrity (ELA) */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-400">
              Plane A — Spatial Integrity (ELA)
            </span>
            <span
              className={`text-[10px] font-mono-tabular px-1.5 py-0.2 rounded border ${
                macroblockOk
                  ? 'text-gray-400 bg-white/[0.04] border-white/[0.06]'
                  : 'text-red-400 bg-red-400/10 border-red-400/20'
              }`}
            >
              {macroblockOk ? '8×8 Macroblocks OK' : 'Seam Divergence'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between font-mono-tabular">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xl font-semibold ${
                  elaAnomaly > 0.5 ? 'text-red-400' : 'text-gray-100'
                }`}
              >
                {elaAnomaly.toFixed(3)}
              </span>
              <span className="text-xs text-gray-400">Δ ELA</span>
            </div>
            <span className="text-[11px] text-gray-400">
              Residual: {q90Residual.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Thin progress meter */}
        <div className="mt-4 space-y-1.5">
          <div className="relative w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                elaAnomaly > 0.5 ? 'bg-red-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, elaAnomaly * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono-tabular">
            <span>JPEG Q=90 Recompression</span>
            <span>Threshold: 0.50</span>
          </div>
        </div>
      </div>

      {/* 3. Plane C: Spectral Purity (2D FFT) */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-400">
              Plane C — Spectral Purity (2D FFT)
            </span>
            <span
              className={`text-[10px] font-mono-tabular px-1.5 py-0.2 rounded border ${
                checkerboardDetected
                  ? 'text-red-400 bg-red-400/10 border-red-400/20'
                  : 'text-gray-400 bg-white/[0.04] border-white/[0.06]'
              }`}
            >
              {checkerboardDetected ? 'Checkerboard Spikes' : 'Clean Spectrum'}
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between font-mono-tabular">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xl font-semibold ${
                  fftAnomaly > 0.5 ? 'text-red-400' : 'text-gray-100'
                }`}
              >
                {fftAnomaly.toFixed(3)}
              </span>
              <span className="text-xs text-gray-400">FFT Anomaly</span>
            </div>
            <span className="text-[11px] text-gray-400">
              High-Pass: {(highPassEnergy * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Thin progress meter */}
        <div className="mt-4 space-y-1.5">
          <div className="relative w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                fftAnomaly > 0.5 ? 'bg-red-400' : 'bg-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, fftAnomaly * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono-tabular">
            <span>High-Pass Circular DFT Energy</span>
            <span>GAN Spikes</span>
          </div>
        </div>
      </div>

      {/* 4. Auxiliary Layer: Neural ViT / SigLIP */}
      <div className="bg-[#12161F] border-hairline rounded-[12px] p-4 flex flex-col justify-between shadow-sm">
        <div>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-gray-400">
              Auxiliary — Neural ViT/SigLIP
            </span>
            <span className="text-[10px] font-mono-tabular text-cyan-300 bg-cyan-950/40 px-1.5 py-0.2 rounded border border-cyan-500/20">
              5f cached
            </span>
          </div>

          <div className="mt-2 flex items-baseline justify-between font-mono-tabular">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-xl font-semibold ${
                  neuralFakeProb > 0.5 ? 'text-red-400' : 'text-gray-100'
                }`}
              >
                {neuralFakeProb.toFixed(3)}
              </span>
              <span className="text-xs text-gray-400">P(Fake)</span>
            </div>
            <span className="text-[11px] text-gray-400">
              {isCached ? 'Scheduler: Cached' : 'Inference: Active'}
            </span>
          </div>
        </div>

        {/* Thin progress meter */}
        <div className="mt-4 space-y-1.5">
          <div className="relative w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                neuralFakeProb > 0.5 ? 'bg-red-400' : 'bg-indigo-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, neuralFakeProb * 100))}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-400 font-mono-tabular">
            <span>Semantic Embedding Drift</span>
            <span>ViT-L/14</span>
          </div>
        </div>
      </div>
    </div>
  );
};
