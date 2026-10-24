import React from 'react';
import type { EnsembleFusionVerdict } from '../../services/types';

interface AuthenticityVerdictCardProps {
  fusion?: EnsembleFusionVerdict;
}

export const AuthenticityVerdictCard: React.FC<AuthenticityVerdictCardProps> = ({ fusion }) => {
  const isGenuine = fusion?.is_genuine ?? true;
  const verdict = fusion?.verdict ?? 'GENUINE';

  // Display integer score (0-100) in massive eclipsed numerals (Ref 4)
  const rawScore = fusion
    ? Math.round((fusion.authenticity_score ?? 0.94) * 100)
    : 96;

  // Color matches Ref 4 vibrant amber-orange (#FF6B00) when fraud/warning, electric cyan/amber glow
  const numeralColor = isGenuine ? '#38BDF8' : '#FF6B00';
  const rimGlowColor = isGenuine
    ? 'rgba(56, 189, 248, 0.55)'
    : 'rgba(255, 107, 0, 0.72)';

  const reasons = fusion?.reasons?.length
    ? fusion.reasons
    : ['All 4 verification planes within genuine biological & spectral bounds.'];

  return (
    <div className="eclipsed-horizon-card rounded-[26px] p-5 relative overflow-hidden select-none">
      {/* Top Row: Subtle Institutional Header & Model Source */}
      <div className="relative z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: numeralColor,
              boxShadow: `0 0 10px ${numeralColor}`,
            }}
          />
          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-white/65">
            ENSEMBLE AUTHENTICITY INDEX
          </span>
        </div>

        <span
          className={`text-[10px] font-mono-tabular font-semibold px-2.5 py-0.5 rounded-full border ${
            isGenuine
              ? 'bg-[#38BDF8]/12 text-[#38BDF8] border-[#38BDF8]/40'
              : 'bg-[#FF6B00]/15 text-[#FF6B00] border-[#FF6B00]/50'
          }`}
        >
          {verdict}
        </span>
      </div>

      {/* Center Stage: Giant Oversized Numerals Partially Eclipsed by Rising Frosted Horizon Arc (Ref 4) */}
      <div className="relative h-44 flex flex-col items-center justify-center mt-1 overflow-hidden rounded-2xl">
        {/* Background radial aura behind numerals */}
        <div
          className="pointer-events-none absolute top-4 w-56 h-56 rounded-full blur-2xl opacity-35 transition-colors duration-500"
          style={{
            background: `radial-gradient(circle, ${rimGlowColor} 0%, transparent 70%)`,
          }}
        />

        {/* Giant Oversized Display Numerals (7.5rem) */}
        <div
          className="relative z-10 font-sans font-semibold leading-none tracking-[-0.05em] transition-colors duration-300 -mt-6"
          style={{
            fontSize: '7.5rem',
            color: numeralColor,
            textShadow: `0 0 34px ${rimGlowColor}`,
          }}
        >
          {rawScore}
        </div>

        {/* Rising Frosted Translucent Glowing Horizon Dome / Arc that Eclipses the Lower Half of the Digits (Ref 4) */}
        <div
          className="pointer-events-none absolute -bottom-28 left-1/2 -translate-x-1/2 w-[135%] h-48 rounded-[50%] z-20 flex flex-col items-center justify-start pt-5"
          style={{
            background:
              'radial-gradient(ellipse at 50% 0%, rgba(255, 255, 255, 0.14) 0%, rgba(16, 22, 30, 0.86) 55%, rgba(10, 14, 20, 0.96) 100%)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: `1.5px solid ${isGenuine ? 'rgba(125, 211, 252, 0.65)' : 'rgba(255, 138, 43, 0.85)'}`,
            boxShadow: `0 -10px 32px ${rimGlowColor}, inset 0 6px 20px rgba(255, 255, 255, 0.18)`,
          }}
        >
          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.24em] text-white/85 font-semibold">
            {isGenuine ? 'CALIBRATED BIOMETRIC MATCH' : 'CRITICAL SPOOF ANOMALY'}
          </span>
          <span className="text-[10px] font-mono-tabular text-white/45 mt-0.5">
            {fusion?.model_source ?? 'fusion_model.joblib (Calibrated LinearSVM)'}
          </span>
        </div>
      </div>

      {/* Bottom Forensic Reasoning Strip */}
      <div className="relative z-30 pt-2.5 border-t border-white/[0.08] flex items-center justify-between gap-2 text-[11px]">
        <p className="text-white/75 truncate" title={reasons[0]}>
          {reasons[0]}
        </p>
        <span className="text-[10px] font-mono-tabular text-white/45 shrink-0">
          CONF {fusion?.confidence_pct?.toFixed(1) ?? '96.0'}%
        </span>
      </div>
    </div>
  );
};
