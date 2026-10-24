import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download } from 'lucide-react';
import type { ForensicLogEntry, DeepGuardTelemetry } from '../../services/types';

interface SessionAuditLogProps {
  logs: ForensicLogEntry[];
  onExportReport: () => void;
  telemetry?: DeepGuardTelemetry | null;
}

export const SessionAuditLog: React.FC<SessionAuditLogProps> = ({
  logs,
  onExportReport,
  telemetry,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const elaAnomaly = (telemetry?.plane_a_ela.ela_anomaly ?? 0.08) > 0.35;
  const seamAlert = telemetry?.plane_a_ela.seam_divergence_detected ?? false;
  const earLow = (telemetry?.plane_b_ear.liveness_score ?? 0.92) < 0.45;
  const fftAlert = (telemetry?.plane_c_fft.fft_anomaly ?? 0.09) > 0.35;
  const vitAlert = (telemetry?.auxiliary_neural.neural_fake_prob ?? 0.04) > 0.45;
  const isFraud = telemetry ? !telemetry.fusion.is_genuine : false;

  // Staggered rows of Inner-Glow Frosted Capsule Pills (Ref 4)
  const pillRows: { label: string; isAlert: boolean }[][] = [
    [
      {
        label: `EAR ${(telemetry?.plane_b_ear.ear_raw ?? 0.31).toFixed(2)}`,
        isAlert: earLow,
      },
      {
        label: seamAlert ? 'Seam Divergence' : 'Q=90 Macroblock OK',
        isAlert: seamAlert || elaAnomaly,
      },
      {
        label: `Blinks: ${telemetry?.plane_b_ear.blink_count ?? 0}`,
        isAlert: false,
      },
    ],
    [
      {
        label: fftAlert ? 'Checkerboard Spike' : 'Azimuthal FFT Clean',
        isAlert: fftAlert,
      },
      {
        label: isFraud ? 'Last Byte Mismatch' : 'Last Byte Verified',
        isAlert: isFraud,
      },
    ],
    [
      {
        label: telemetry?.auxiliary_neural.cached
          ? `ViT Cached (F#${telemetry?.auxiliary_neural.keyframe_index ?? 0})`
          : 'ViT Keyframe Sync',
        isAlert: vitAlert,
      },
      {
        label: `Latency ${(telemetry?.fusion.latency_ms ?? 28).toFixed(0)}ms`,
        isAlert: false,
      },
      {
        label: isFraud ? 'Fraud Alert' : 'Live Human',
        isAlert: isFraud,
      },
    ],
  ];

  const displayLogs = isExpanded ? logs.slice(0, 12) : logs.slice(0, 3);

  return (
    <div className="eclipsed-horizon-card rounded-[26px] p-5 flex flex-col justify-between space-y-4">
      {/* Header with Export Forensic JSON Pill & Expand Toggle */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white/80 shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
          <span className="text-[10px] font-mono-tabular uppercase tracking-[0.2em] text-white/70">
            FORENSIC TELEMETRY PILL MATRIX
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onExportReport}
            className="frosted-pill-neutral px-3 py-1 text-[10px] font-mono-tabular text-white/90 hover:text-white flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
          >
            <Download className="w-3 h-3 text-[#38BDF8]" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-white/60 hover:text-white transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse Audit Trail' : 'Expand Audit Trail'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Signature D (Ref 4): Staggered Horizontal Brick Wall of Inner-Lit Frosted Capsule Pills */}
      <div className="space-y-2.5 py-1">
        {pillRows.map((row, rIdx) => (
          <div
            key={rIdx}
            className={`flex flex-wrap items-center gap-2 ${
              rIdx === 1 ? 'pl-3' : rIdx === 2 ? 'pl-1' : ''
            }`}
          >
            {row.map((pill, pIdx) => (
              <div
                key={pIdx}
                className={`px-4 py-2 text-xs font-medium tracking-tight transition-all select-none ${
                  pill.isAlert
                    ? 'frosted-pill-amber text-[#FB923C] font-semibold'
                    : 'frosted-pill-neutral text-white/85'
                }`}
              >
                {pill.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Compact Chronological Event Stream */}
      <div className="pt-2.5 border-t border-white/[0.08] space-y-1.5 font-mono-tabular text-[11px]">
        {displayLogs.length === 0 ? (
          <div className="text-white/40 text-center py-1">
            Synchronizing real-time forensic stream...
          </div>
        ) : (
          displayLogs.map((log) => {
            const isCrit = log.severity === 'CRITICAL';
            return (
              <div
                key={log.id}
                className="flex items-center justify-between gap-2 text-white/70 py-0.5"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-white/40 shrink-0">{log.timestamp}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 ${
                      isCrit
                        ? 'bg-[#FF6B00]/20 text-[#FB923C] border border-[#FF6B00]/40'
                        : 'bg-white/[0.05] text-white/75 border border-white/[0.12]'
                    }`}
                  >
                    {log.category}
                  </span>
                  <span
                    className={`truncate ${isCrit ? 'text-[#FB923C]' : 'text-white/75'}`}
                    title={log.message}
                  >
                    {log.message}
                  </span>
                </div>
                <span className="text-[10px] text-white/35 shrink-0">#{log.frame_index}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
