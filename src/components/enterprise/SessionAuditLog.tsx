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
    <div className="w-full bg-[#12141A] border border-white/[0.08] rounded-[16px] p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs font-semibold text-gray-200">
            Audit Trail & Event Log
          </span>
          <span className="text-[10px] font-mono-tabular bg-white/[0.04] px-2 py-0.5 rounded-full text-gray-400 border border-white/[0.06]">
            {logs.length} events
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportReport}
            className="flex items-center gap-1.5 text-[11px] font-medium text-gray-200 hover:text-white px-3 py-1 rounded-full bg-[#171922] hover:bg-[#1E212D] border border-white/[0.08] transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3 text-gray-400" />
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
                        ? 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20'
                        : log.category === 'SPATIAL'
                        ? 'text-[#FF6B4A] bg-[#FF5733]/10 border-[#FF5733]/30'
                        : log.category === 'SPECTRAL'
                        ? 'text-violet-400 bg-violet-950/40 border-violet-500/20'
                        : 'text-amber-400 bg-amber-950/40 border-amber-500/20'
                    }`}
                  >
                    {log.category}
                  </span>
                  <span
                    className={`truncate text-xs ${
                      isCritical ? 'text-[#FF6B4A] font-medium' : 'text-gray-300'
                    }`}
                    title={log.message}
                  >
                    {log.message}
                  </span>
                </div>

                <span className="text-[10px] text-gray-400 flex-shrink-0">
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
