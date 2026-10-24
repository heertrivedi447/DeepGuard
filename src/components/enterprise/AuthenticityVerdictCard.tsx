import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import type { EnsembleFusionVerdict } from '../../services/types';

interface AuthenticityVerdictCardProps {
  fusion?: EnsembleFusionVerdict;
}

export const AuthenticityVerdictCard: React.FC<AuthenticityVerdictCardProps> = ({ fusion }) => {
  const isGenuine = fusion?.is_genuine ?? true;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full frosted-glass-card rounded-[18px] p-5 shadow-xl overflow-hidden"
    >
      {/* 1. Faint Decorative Cyber Micro-Text & Minimal Data Nodes in Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden select-none z-0">
        {/* Ambient Deep Indigo & Teal Radial Dome */}
        <div
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-80 h-36 rounded-full blur-3xl opacity-30 transition-colors duration-500"
          style={{
            background: isGenuine
              ? 'radial-gradient(circle, rgba(0, 151, 167, 0.55) 0%, rgba(30, 58, 138, 0.45) 50%, transparent 80%)'
              : 'radial-gradient(circle, rgba(234, 179, 8, 0.5) 0%, rgba(239, 68, 68, 0.35) 50%, transparent 80%)',
          }}
        />

        {/* Faint Micro-Text Watermark Lines */}
        <div className="absolute top-2.5 right-4 text-[9px] font-mono tracking-widest text-[#0097A7]/25 uppercase">
          SYNCHRONISING 99.4% // NODE_CLUSTER: ACTIVE
        </div>
        <div className="absolute bottom-2.5 left-4 text-[8px] font-mono tracking-widest text-[#1E3A8A]/40 uppercase">
          LATENCY 12ms // KERNEL 0x1E3A8A // AUTH_ENGINE: FUSION
        </div>

        {/* Subtle Background Cyber Data Nodes */}
        <div className="absolute top-1/2 right-8 flex items-center gap-1.5 opacity-20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0097A7] animate-ping" />
          <span className="text-[8px] font-mono text-[#0097A7]">NODE_0x7F</span>
        </div>
      </div>

      {/* Header Label and Status Pill */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#0097A7] shadow-[0_0_8px_#0097A7]" />
          <span className="text-xs uppercase font-semibold tracking-wider text-gray-300">
            Verification Result
          </span>
        </div>

        <span
          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-all ${
            isGenuine
              ? 'bg-[#0097A7]/10 text-[#0097A7] border-[#0097A7]/30 shadow-[0_0_10px_rgba(0,151,167,0.2)]'
              : 'bg-[#EAB308]/10 text-[#EAB308] border-[#EAB308]/30 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
          }`}
        >
          {isGenuine ? 'Passed' : 'Action Required'}
        </span>
      </div>

      {/* Clean Binary Status Indicator with Active Network Node Glow */}
      <div className="relative z-10 py-4 flex items-center gap-4">
        {/* 2. Soft Breathing Glow Matching Teal/Indigo Palette */}
        <motion.div
          className="w-13 h-13 rounded-2xl flex items-center justify-center border flex-shrink-0 transition-all"
          animate={{
            boxShadow: isGenuine
              ? [
                  '0 0 10px rgba(0, 151, 167, 0.35), 0 0 20px rgba(30, 58, 138, 0.2)',
                  '0 0 24px rgba(0, 151, 167, 0.75), 0 0 38px rgba(30, 58, 138, 0.45)',
                  '0 0 10px rgba(0, 151, 167, 0.35), 0 0 20px rgba(30, 58, 138, 0.2)',
                ]
              : [
                  '0 0 10px rgba(234, 179, 8, 0.35), 0 0 20px rgba(239, 68, 68, 0.2)',
                  '0 0 24px rgba(234, 179, 8, 0.75), 0 0 35px rgba(239, 68, 68, 0.4)',
                  '0 0 10px rgba(234, 179, 8, 0.35), 0 0 20px rgba(239, 68, 68, 0.2)',
                ],
            borderColor: isGenuine
              ? ['rgba(0, 151, 167, 0.35)', 'rgba(0, 151, 167, 0.85)', 'rgba(0, 151, 167, 0.35)']
              : ['rgba(234, 179, 8, 0.35)', 'rgba(234, 179, 8, 0.85)', 'rgba(234, 179, 8, 0.35)'],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            backgroundColor: isGenuine ? 'rgba(0, 151, 167, 0.12)' : 'rgba(234, 179, 8, 0.12)',
            color: isGenuine ? '#0097A7' : '#EAB308',
          }}
        >
          {isGenuine ? (
            <CheckCircle2 className="w-7 h-7 text-[#0097A7]" />
          ) : (
            <AlertTriangle className="w-7 h-7 text-[#EAB308]" />
          )}
        </motion.div>

        <div>
          <div className="flex items-center gap-2">
            <h3
              className={`text-xl font-bold tracking-tight ${
                isGenuine ? 'text-white' : 'text-[#EAB308]'
              }`}
            >
              {isGenuine ? 'Identity Verified' : 'Verification Failed'}
            </h3>
            {isGenuine && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#1E3A8A]/40 text-cyan-300 border border-[#0097A7]/30">
                ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {isGenuine
              ? 'Real live identity confirmed. Anti-spoofing criteria satisfied.'
              : 'Biometric variance detected. Please align with reticle and try again.'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
