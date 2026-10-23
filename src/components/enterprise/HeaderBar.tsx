import React from 'react';
import { Camera, Upload, Sliders } from 'lucide-react';
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
    <header className="w-full border-b border-white/[0.08] bg-[#0A0B0E]/95 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Mark with Dual Violet & Coral Diamond Badge (Inspired by Reference 5) */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-[#14161E] border border-white/[0.08] flex items-center justify-center p-1.5 shadow-sm">
            {/* Dual isometric blocks: Violet & Coral */}
            <div className="grid grid-cols-2 gap-1 w-full h-full items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#9333EA] shadow-[0_0_8px_rgba(147,51,234,0.6)]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#FF5733] shadow-[0_0_8px_rgba(255,87,51,0.6)]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-white/10" />
              <div className="w-2.5 h-2.5 rounded-sm bg-white/20" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-base tracking-tight text-white font-sans">
              DeepGuard
            </span>
          </div>
        </div>

        {/* Center: Primary Action Segmented Control (Charcoal Matte Pills) */}
        <div className="flex items-center p-1 bg-[#13151B] border border-white/[0.08] rounded-xl shadow-inner">
          <button
            onClick={() => onSelectInputSource('LIVE_WEBCAM')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              inputSource === 'LIVE_WEBCAM'
                ? 'bg-[#1C1F2B] text-white border border-white/10 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-violet-400" />
            <span>Live Webcam</span>
          </button>

          <button
            onClick={() => onSelectInputSource('UPLOAD_VIDEO')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              inputSource === 'UPLOAD_VIDEO'
                ? 'bg-[#1C1F2B] text-white border border-white/10 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-coral-400" style={{ color: '#FF6B4A' }} />
            <span>Upload KYC Video</span>
          </button>

          <button
            onClick={() => onSelectInputSource('ATTACK_SIMULATOR')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              inputSource === 'ATTACK_SIMULATOR'
                ? 'bg-[#1C1F2B] text-white border border-white/10 shadow-sm'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Synthetic Attack Simulator</span>
          </button>
        </div>

        {/* Right Spacer for balanced alignment */}
        <div className="w-8" />
      </div>
    </header>
  );
};
