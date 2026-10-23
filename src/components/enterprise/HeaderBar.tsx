import React from 'react';
import { Shield, Camera, Upload, Sliders, Cpu, Activity, Database } from 'lucide-react';
import type { InputSourceMode, SystemHealthStats } from '../../services/types';

interface HeaderBarProps {
  inputSource: InputSourceMode;
  onSelectInputSource: (mode: InputSourceMode) => void;
  healthStats?: SystemHealthStats;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  inputSource,
  onSelectInputSource,
  healthStats,
}) => {
  return (
    <header className="w-full border-b border-white/[0.07] bg-[#0B0D11]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Subtle Brand Mark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.12] border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-base tracking-tight text-gray-100">
              DeepGuard
            </span>
            <span className="text-[11px] text-gray-400 font-normal bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.06]">
              v1.0 • Multi-Plane KYC Engine
            </span>
          </div>
        </div>

        {/* Center: Input Source Selector Segmented Control */}
        <div className="flex items-center p-1 bg-[#12161F] border border-white/[0.07] rounded-lg">
          <button
            onClick={() => onSelectInputSource('LIVE_WEBCAM')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              inputSource === 'LIVE_WEBCAM'
                ? 'bg-white/[0.10] text-gray-100 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Live Webcam</span>
          </button>

          <button
            onClick={() => onSelectInputSource('UPLOAD_VIDEO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              inputSource === 'UPLOAD_VIDEO'
                ? 'bg-white/[0.10] text-gray-100 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload KYC Video</span>
          </button>

          <button
            onClick={() => onSelectInputSource('ATTACK_SIMULATOR')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
              inputSource === 'ATTACK_SIMULATOR'
                ? 'bg-white/[0.10] text-gray-100 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Synthetic Attack Simulator</span>
          </button>
        </div>

        {/* Right: Quiet System Health Pills */}
        <div className="flex items-center gap-2 font-mono-tabular text-xs">
          {/* FPS pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-md text-gray-300">
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>{healthStats?.fps ?? 24.8} FPS</span>
          </div>

          {/* Keyframe Cache pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-md text-gray-400">
            <Cpu className="w-3 h-3 text-gray-400" />
            <span>Keyframe: <strong className="text-gray-300 font-medium">Every 5th Frame</strong></span>
          </div>

          {/* Fusion Model pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.03] border border-white/[0.06] rounded-md text-gray-400">
            <Database className="w-3 h-3 text-cyan-400" />
            <span>Model: <strong className="text-gray-300 font-medium">LinearSVM • Active</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
};
