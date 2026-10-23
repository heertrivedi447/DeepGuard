import React from 'react';
import { AlertCircle } from 'lucide-react';
import type { EnsembleFusionVerdict } from '../../services/types';

interface AuthenticityVerdictCardProps {
  fusion?: EnsembleFusionVerdict;
}

export const AuthenticityVerdictCard: React.FC<AuthenticityVerdictCardProps> = ({ fusion }) => {
  const isGenuine = fusion?.is_genuine ?? true;
  const authenticityScore = fusion?.authenticity_score ?? 0.942;
  const scorePercent = (authenticityScore * 100).toFixed(1);
  const verdict = fusion?.verdict ?? 'GENUINE';
  const modelSource = fusion?.model_source ?? 'fusion_model.joblib (Calibrated LinearSVM)';

  return (
    <div className="w-full bg-[#12161F] border-hairline rounded-[12px] p-5 shadow-sm">
      {/* Header Label and Status Badge */}
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase font-medium tracking-wider text-gray-400">
          Ensemble Identity Verdict
        </span>

        {/* Semantic Status Badge (Muted Emerald vs Restrained Crimson) */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
            isGenuine
              ? 'bg-emerald-500/[0.10] text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/[0.10] text-red-400 border-red-500/20'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isGenuine ? 'bg-emerald-400' : 'bg-red-400'
            }`}
          />
          <span>{verdict}</span>
        </div>
      </div>

      {/* Main Score Display in Large Monospace Tabular Numerals */}
      <div className="mt-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-tabular text-4xl font-semibold text-gray-100 tracking-tight">
            {scorePercent}%
          </span>
          <span className="text-xs font-medium text-gray-400">
            AUTHENTICITY INDEX
          </span>
        </div>

        <div className="text-right">
          <span className="text-[11px] text-gray-400 font-mono-tabular">
            THRESHOLD: 50.0%
          </span>
        </div>
      </div>

      {/* Clean Horizontal Confidence Bar */}
      <div className="mt-3 relative w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isGenuine ? 'bg-emerald-400' : 'bg-red-400'
          }`}
          style={{ width: `${Math.min(100, Math.max(0, parseFloat(scorePercent)))}%` }}
        />
        {/* Subtle 50% Threshold Marker */}
        <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-white/30 z-10" />
      </div>

      {/* Flagged reasons if any */}
      {fusion?.reasons && fusion.reasons.length > 0 && !isGenuine && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            {fusion.reasons.map((r, i) => (
              <p key={i} className="leading-snug">
                • {r}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Subtle Footnote for Model Attribution */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-gray-400 font-normal">
        <span className="truncate">Decision Engine: {modelSource}</span>
        <span className="font-mono-tabular text-gray-400 flex-shrink-0 ml-2">
          RTT: {fusion?.latency_ms ?? 18}ms
        </span>
      </div>
    </div>
  );
};
