import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { EnsembleFusionVerdict } from '../../services/types';

interface AuthenticityVerdictCardProps {
  fusion?: EnsembleFusionVerdict;
}

export const AuthenticityVerdictCard: React.FC<AuthenticityVerdictCardProps> = ({ fusion }) => {
  const isGenuine = fusion?.is_genuine ?? true;

  return (
    <div className="w-full bg-[#12161F] border-hairline rounded-[12px] p-5 shadow-sm">
      {/* Header Label */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <span className="text-xs uppercase font-medium tracking-wider text-gray-400">
          Verification Result
        </span>
        <span
          className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
            isGenuine
              ? 'bg-emerald-500/[0.10] text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/[0.10] text-red-400 border-red-500/20'
          }`}
        >
          {isGenuine ? 'Passed' : 'Attention Required'}
        </span>
      </div>

      {/* Clean Binary Status Indicator */}
      <div className="py-4 flex items-center gap-3.5">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${
            isGenuine
              ? 'bg-emerald-500/[0.10] border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/[0.10] border-red-500/30 text-red-400'
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
              isGenuine ? 'text-emerald-400' : 'text-red-400'
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
