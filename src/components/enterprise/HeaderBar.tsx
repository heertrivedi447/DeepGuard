import React from 'react';
import { Shield, Camera, Upload, Sliders } from 'lucide-react';
import type { InputSourceMode, SystemHealthStats } from '../../services/types';

interface HeaderBarProps {
  inputSource: InputSourceMode;
  onSelectInputSource: (mode: InputSourceMode) => void;
  healthStats?: SystemHealthStats;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  inputSource,
  onSelectInputSource,
}) => {
  return (
    <header className="w-full border-b border-white/[0.07] bg-[#0B0D11]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Mark (without technical version/subtext) */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.12] border border-emerald-500/20 flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>

          <span className="font-semibold text-base tracking-tight text-gray-100">
            DeepGuard
          </span>
        </div>

        {/* Center: Primary Action Buttons Intact */}
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

        {/* Right: Technical metrics removed; clean alignment spacer */}
        <div className="w-8" />
      </div>
    </header>
  );
};
