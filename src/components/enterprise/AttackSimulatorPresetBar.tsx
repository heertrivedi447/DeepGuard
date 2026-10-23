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
      description: 'Natural eye blinks, authentic facial dynamics',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      accentColor: '#10B981',
      activeBorder: 'border-emerald-500/40 bg-emerald-500/[0.08] shadow-[0_0_12px_rgba(16,185,129,0.15)]',
    },
    {
      id: 'STATIC_PHOTO_REPLAY',
      title: '2. Static Photo / Replay',
      description: 'Zero ocular movement, flat biological response',
      icon: <Copy className="w-3.5 h-3.5 text-amber-400" />,
      accentColor: '#F59E0B',
      activeBorder: 'border-amber-500/40 bg-amber-500/[0.08] shadow-[0_0_12px_rgba(245,158,11,0.15)]',
    },
    {
      id: 'FACESWAP_BOUNDARY_SPLICE',
      title: '3. Face-Swap Boundary Splice',
      description: 'Digital boundary splicing and edge alterations',
      icon: <Scissors className="w-3.5 h-3.5 text-[#FF6B4A]" />,
      accentColor: '#FF5733',
      activeBorder: 'border-[#FF5733]/40 bg-[#FF5733]/[0.08] shadow-[0_0_12px_rgba(255,87,51,0.2)]',
    },
    {
      id: 'GAN_UPSAMPLING_STREAM',
      title: '4. GAN Upsampling Stream',
      description: 'Synthetic generative artifacts & neural manifold drift',
      icon: <Sparkles className="w-3.5 h-3.5 text-violet-400" />,
      accentColor: '#9333EA',
      activeBorder: 'border-violet-500/40 bg-violet-500/[0.08] shadow-[0_0_12px_rgba(147,51,234,0.2)]',
    },
  ];

  return (
    <div className="w-full bg-[#12141A] border border-white/[0.08] rounded-[16px] p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase font-medium tracking-wider text-gray-400">
          Forensic Attack Simulation Bench
        </span>
        <span className="text-[11px] text-gray-400">
          Evaluate multi-plane response across threat models
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
                  : 'bg-[#171922] border-white/[0.06] hover:bg-[#1C1F2B] hover:border-white/[0.12] text-gray-300'
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
