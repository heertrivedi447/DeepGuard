import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { EnsembleFusionVerdict } from '../../services/types';

interface AuthenticityVerdictCardProps {
  fusion?: EnsembleFusionVerdict;
}

export const AuthenticityVerdictCard: React.FC<AuthenticityVerdictCardProps> = ({ fusion }) => {
  const isGenuine = fusion?.is_genuine ?? true;

  return (
    <div className="relative w-full bg-[#12141A] border border-white/[0.08] rounded-[16px] p-5 shadow-lg overflow-hidden">
      {/* Soft Ambient Radial Glow Dome (Inspired by Reference Image 4) */}
      <div
        className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 w-72 h-36 rounded-full blur-2xl opacity-40 transition-colors duration-500"
        style={{
          background: isGenuine
            ? 'radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, rgba(16, 185, 129, 0.3) 50%, transparent 80%)'
            : 'radial-gradient(circle, rgba(255, 87, 51, 0.6) 0%, rgba(249, 115, 22, 0.3) 50%, transparent 80%)',
        }}
      />

      {/* Header Label and Status Pill */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <span className="text-xs uppercase font-medium tracking-wider text-gray-400">
          Verification Result
        </span>
        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
            isGenuine
              ? 'bg-emerald-500/[0.10] text-emerald-400 border-emerald-500/20'
              : 'bg-[#FF5733]/[0.10] text-[#FF6B4A] border-[#FF5733]/30'
          }`}
        >
          {isGenuine ? 'Passed' : 'Attention Required'}
        </span>
      </div>

      {/* Clean Binary Status Indicator */}
      <div className="relative z-10 py-4 flex items-center gap-4">
        {/* Glowing Status Icon Badge */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 transition-all ${
            isGenuine
              ? 'bg-emerald-500/[0.12] border-emerald-500/30 text-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
              : 'bg-[#FF5733]/[0.12] border-[#FF5733]/30 text-[#FF6B4A] shadow-[0_0_16px_rgba(255,87,51,0.25)]'
          }`}
        >
          {isGenuine ? (
            <CheckCircle2 className="w-7 h-7" />
          ) : (
            <AlertTriangle className="w-7 h-7" />
          )}
        </div>

        <div>
          <h3
            className={`text-xl font-bold tracking-tight ${
              isGenuine ? 'text-white' : 'text-[#FF6B4A]'
            }`}
          >
            {isGenuine ? 'Identity Verified' : 'Verification Failed'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {isGenuine
              ? 'Real live identity confirmed. You may proceed.'
              : 'Unusual patterns detected. Please face the camera and try again.'}
          </p>
        </div>
      </div>
    </div>
  );
};
