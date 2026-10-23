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
  }[] = [
    {
      id: 'GENUINE_LIVE_USER',
      title: '1. Genuine Live User',
      description: 'Spontaneous blinks (<0.22), natural macroblocks, organic spectrum',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
    },
    {
      id: 'STATIC_PHOTO_REPLAY',
      title: '2. Static Photo / Replay',
      description: 'Zero ocular variance, flat EAR line across 30f window',
      icon: <Copy className="w-3.5 h-3.5 text-amber-400" />,
    },
    {
      id: 'FACESWAP_BOUNDARY_SPLICE',
      title: '3. Face-Swap Boundary Splice',
      description: 'High ELA divergence (0.88), JPEG boundary mismatch',
      icon: <Scissors className="w-3.5 h-3.5 text-red-400" />,
    },
    {
      id: 'GAN_UPSAMPLING_STREAM',
      title: '4. GAN Upsampling Stream',
      description: 'Periodic checkerboard DFT spikes (0.91) + ViT fake probability',
      icon: <Sparkles className="w-3.5 h-3.5 text-purple-400" />,
    },
  ];

  return (
    <div className="w-full bg-[#12161F] border-hairline rounded-[12px] p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-xs uppercase font-medium tracking-wider text-gray-400">
          Forensic Attack Simulation Bench
        </span>
        <span className="text-[11px] text-gray-400">
          Select preset to evaluate real-time multi-plane response
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {presets.map((p) => {
          const isSelected = currentPreset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`p-2.5 text-left rounded-lg border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white/[0.08] border-emerald-500/40 shadow-sm'
                  : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
              }`}
            >
              <div className="flex items-center gap-1.5 font-medium text-xs text-gray-200">
                {p.icon}
                <span className={isSelected ? 'text-gray-100 font-semibold' : 'text-gray-300'}>
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
