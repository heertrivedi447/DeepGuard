import React from 'react';
import { ShieldCheck, Copy, Scissors, Sparkles } from 'lucide-react';
import type { AttackSimulationPreset } from '../../services/types';

interface AttackSimulatorPresetBarProps {
  currentPreset: AttackSimulationPreset;
  onSelectPreset: (preset: AttackSimulationPreset) => void;
}

export const AttackSimulatorPresetBar: React.FC<AttackSimulatorPresetBarProps> = ({
  currentPreset,
  onSelectPreset,
}) => {
  const presets: {
    id: AttackSimulationPreset;
    title: string;
    description: string;
    icon: React.ReactNode;
    accentColor: string;
    activeBorder: string;
  }[] = [
    {
      id: 'GENUINE_LIVE_USER',
      title: '1. Genuine Live User',
      description: 'Natural eye blinks, authentic biological dynamics',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#0097A7]" />,
      accentColor: '#0097A7',
      activeBorder: 'border-[#0097A7]/50 bg-[#0097A7]/[0.12] shadow-[0_0_16px_rgba(0,151,167,0.25)]',
    },
    {
      id: 'STATIC_PHOTO_REPLAY',
      title: '2. Static Photo / Replay',
      description: 'Zero ocular movement, flat biological response',
      icon: <Copy className="w-3.5 h-3.5 text-[#EAB308]" />,
      accentColor: '#EAB308',
      activeBorder: 'border-[#EAB308]/50 bg-[#EAB308]/[0.12] shadow-[0_0_16px_rgba(234,179,8,0.25)]',
    },
    {
      id: 'FACESWAP_BOUNDARY_SPLICE',
      title: '3. Face-Swap Boundary Splice',
      description: 'Digital boundary splicing and edge alterations',
      icon: <Scissors className="w-3.5 h-3.5 text-amber-400" />,
      accentColor: '#F59E0B',
      activeBorder: 'border-amber-500/50 bg-amber-500/[0.12] shadow-[0_0_16px_rgba(245,158,11,0.25)]',
    },
    {
      id: 'GAN_UPSAMPLING_STREAM',
      title: '4. GAN Upsampling Stream',
      description: 'Synthetic generative artifacts & neural manifold drift',
      icon: <Sparkles className="w-3.5 h-3.5 text-indigo-400" />,
      accentColor: '#1E3A8A',
      activeBorder: 'border-indigo-500/50 bg-[#1E3A8A]/[0.35] shadow-[0_0_16px_rgba(30,58,138,0.4)]',
    },
  ];

  return (
    <div className="w-full frosted-glass-card rounded-[18px] p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0097A7] shadow-[0_0_8px_#0097A7]" />
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-300">
            Forensic Attack Simulation Bench
          </span>
        </div>
        <span className="text-[11px] font-mono text-gray-400">
          CYBER-THREAT MATRIX // MULTI-PLANE RESPONSE
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.map((p) => {
          const isSelected = currentPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`p-3 text-left rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? `${p.activeBorder} text-white`
                  : 'bg-[#0E131F]/50 border-white/[0.06] hover:bg-[#141B2B]/60 hover:border-white/[0.12] text-gray-300'
              }`}
            >
              <div className="flex items-center gap-1.5 font-semibold text-xs">
                {p.icon}
                <span className={isSelected ? 'text-white font-bold' : 'text-gray-200'}>
                  {p.title}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-gray-400 leading-tight">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
