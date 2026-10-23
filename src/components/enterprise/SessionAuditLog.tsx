import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Download, Clock } from 'lucide-react';
import type { ForensicLogEntry } from '../../services/types';

interface SessionAuditLogProps {
  logs: ForensicLogEntry[];
  onExportReport: () => void;
}

export const SessionAuditLog: React.FC<SessionAuditLogProps> = ({ logs, onExportReport }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Show 4 rows when collapsed, up to 20 when expanded
  const displayLogs = isExpanded ? logs.slice(0, 20) : logs.slice(0, 4);

  return (
    <div className="w-full frosted-glass-card rounded-[18px] p-4.5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#0097A7]" />
          <span className="text-xs font-semibold text-gray-200">
            Audit Trail & Event Log
          </span>
          <span className="text-[10px] font-mono-tabular bg-[#0097A7]/10 px-2 py-0.5 rounded-full text-[#0097A7] border border-[#0097A7]/25">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-[#0097A7] hover:text-white px-3 py-1 rounded-full bg-[#0097A7]/10 hover:bg-[#0097A7]/20 border border-[#0097A7]/30 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,151,167,0.15)]"
          >
            <Download className="w-3 h-3 text-[#0097A7]" />
            <span>Export Report</span>
          </button>

          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 4-Row Log Display */}
      <div className="mt-2.5 divide-y divide-white/[0.04] font-mono-tabular text-xs">
        {displayLogs.length === 0 ? (
          <div className="py-3 text-center text-gray-400 text-xs">
            Awaiting session verification events...
          </div>
        ) : (
          displayLogs.map((log) => {
            const isCritical = log.severity === 'CRITICAL';
            return (
              <div
                key={log.id}
                className="py-1.5 flex items-baseline justify-between gap-3 text-gray-300 hover:bg-white/[0.02] px-1.5 rounded transition-colors"
              >
                <div className="flex items-baseline gap-2 truncate">
                  <span className="text-[11px] text-gray-400 flex-shrink-0">
                    {log.timestamp}
                  </span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded border flex-shrink-0 font-medium ${
                      log.category === 'LIVENESS'
                        ? 'text-[#0097A7] bg-[#0097A7]/15 border-[#0097A7]/30'
                        : log.category === 'SPATIAL'
                        ? 'text-indigo-300 bg-[#1E3A8A]/30 border-[#1E3A8A]/50'
                        : log.category === 'SPECTRAL'
                        ? 'text-cyan-400 bg-cyan-950/40 border-cyan-500/30'
                        : 'text-[#EAB308] bg-[#EAB308]/15 border-[#EAB308]/30'
                    }`}
                  >
                    {log.category}
                  </span>
                  <span
                    className={`truncate text-xs ${
                      isCritical ? 'text-[#EAB308] font-medium' : 'text-gray-300'
                    }`}
                    title={log.message}
                  >
                    {log.message}
                  </span>
                </div>

                <span className="text-[10px] text-gray-400 flex-shrink-0 font-mono">
                  #{log.frame_index}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
