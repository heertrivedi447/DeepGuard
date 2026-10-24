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
    <header className="w-full border-b border-white/[0.08] bg-[#0A0B0E]/80 backdrop-blur-xl sticky top-0 z-40 shadow-lg">
      <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand Mark with Deep Indigo, Vibrant Teal & Gold Neubrutalist Badge */}
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-lg bg-[#0E131F] border border-[#0097A7]/40 flex items-center justify-center p-1.5 shadow-[0_0_12px_rgba(0,151,167,0.25)]">
            {/* Cyber Isometric Grid: Teal, Indigo, Gold */}
            <div className="grid grid-cols-2 gap-1 w-full h-full items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#0097A7] shadow-[0_0_8px_#0097A7]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#1E3A8A] shadow-[0_0_6px_#1E3A8A]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-[#EAB308] shadow-[0_0_6px_#EAB308]" />
              <div className="w-2.5 h-2.5 rounded-sm bg-white/20" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white font-sans">
              DeepGuard
            </span>
            <span className="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-[#1E3A8A]/30 border border-[#0097A7]/30 text-[#0097A7]">
              CYBER-SHIELD
            </span>
          </div>
        </div>

        {/* Center: Primary Action Segmented Control (Frosted Glass Panel with Teal/Gold Accents) */}
        <div className="flex items-center p-1 bg-[#0E131F]/80 backdrop-blur-md border border-white/[0.08] rounded-xl shadow-inner">
          <button
            onClick={() => onSelectInputSource('LIVE_WEBCAM')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              inputSource === 'LIVE_WEBCAM'
                ? 'bg-[#0097A7]/20 text-[#0097A7] border border-[#0097A7]/40 shadow-[0_0_12px_rgba(0,151,167,0.25)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-[#0097A7]" />
            <span>Live Webcam</span>
          </button>

          <button
            onClick={() => onSelectInputSource('UPLOAD_VIDEO')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              inputSource === 'UPLOAD_VIDEO'
                ? 'bg-[#1E3A8A]/30 text-indigo-300 border border-[#1E3A8A]/60 shadow-[0_0_12px_rgba(30,58,138,0.3)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-[#0097A7]" />
            <span>Upload KYC Video</span>
          </button>

          <button
            onClick={() => onSelectInputSource('ATTACK_SIMULATOR')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              inputSource === 'ATTACK_SIMULATOR'
                ? 'bg-[#EAB308]/15 text-[#EAB308] border border-[#EAB308]/40 shadow-[0_0_12px_rgba(234,179,8,0.25)]'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#EAB308]" />
            <span>Synthetic Attack Simulator</span>
          </button>
        </div>

        {/* Right Spacer for balanced alignment */}
        <div className="w-8" />
      </div>
    </header>
  );
};
