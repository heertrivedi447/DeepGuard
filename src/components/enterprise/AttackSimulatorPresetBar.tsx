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
    code: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    isAttack: boolean;
  }[] = [
    {
      id: 'GENUINE_LIVE_USER',
      code: 'MODE 01',
      title: 'Genuine Live User',
      description: 'Natural bilateral eye blinks, authentic Q=90 & spectral baseline',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8]" />,
      isAttack: false,
    },
    {
      id: 'STATIC_PHOTO_REPLAY',
      code: 'MODE 02',
      title: 'Static Photo / Screen Replay',
      description: 'Frozen ocular landmarks, zero EAR variance (liveness ≤ 0.05)',
      icon: <Copy className="w-3.5 h-3.5 text-[#FF6B00]" />,
      isAttack: true,
    },
    {
      id: 'FACESWAP_BOUNDARY_SPLICE',
      code: 'MODE 03',
      title: 'Face-Swap Boundary Splice',
      description: 'High Q=90 ELA compression divergence along facial mask seams',
      icon: <Scissors className="w-3.5 h-3.5 text-[#FF6B00]" />,
      isAttack: true,
    },
    {
      id: 'GAN_UPSAMPLING_STREAM',
      code: 'MODE 04',
      title: 'GAN Upsampling Stream',
      description: 'Periodic 2D-FFT high-pass checkerboard spikes & ViT drift',
      icon: <Sparkles className="w-3.5 h-3.5 text-[#60A5FA]" />,
      isAttack: true,
    },
  ];

  return (
    <div className="w-full bg-[#0B0D13]/90 border border-white/[0.10] rounded-[22px] p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#38BDF8] shadow-[0_0_10px_#38BDF8]" />
          <span className="text-[11px] font-geometric-display uppercase font-bold tracking-[0.2em] text-white/90">
            WebSocket SET_MODE Preset Matrix
          </span>
        </div>
        <span className="text-[10px] font-mono-tabular tracking-[0.16em] text-white/45 uppercase">
          DISPATCHING TO WS://LOCALHOST:8000/WS/STREAM
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {presets.map((p) => {
          const isSelected = currentPreset === p.id;
          const activeClass = isSelected
            ? p.isAttack
              ? 'frosted-pill-amber rounded-2xl text-white'
              : 'frosted-pill-cyan rounded-2xl text-white'
            : 'bg-white/[0.025] border border-white/[0.08] hover:border-white/[0.2] hover:bg-white/[0.05] rounded-2xl text-white/75';

          return (
            <button
              key={p.id}
              onClick={() => onSelectPreset(p.id)}
              className={`p-3.5 text-left transition-all cursor-pointer ${activeClass}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-1.5 font-semibold text-xs">
                  {p.icon}
                  <span className={isSelected ? 'text-white font-bold' : 'text-white/90'}>
                    {p.title}
                  </span>
                </div>
                <span className="text-[9px] font-mono-tabular px-2 py-0.5 rounded-full bg-black/40 border border-white/[0.1] text-white/60">
                  {p.code}
                </span>
              </div>
              <p className="text-[11px] text-white/55 leading-snug">
                {p.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
