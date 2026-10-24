import React, { useState } from 'react';
import { CameraOff, Camera as CameraIcon, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { FaceRoiOverlay } from './FaceRoiOverlay';
import type { DeepGuardTelemetry, InputSourceMode } from '../../services/types';

interface BiometricViewportProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  telemetry: DeepGuardTelemetry | null;
  isActive: boolean;
  isLoading: boolean;
  inputSource: InputSourceMode;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onUploadFile?: (file: File) => void;
}

export const BiometricViewport: React.FC<BiometricViewportProps> = ({
  videoRef,
  canvasRef,
  telemetry,
  isActive,
  isLoading,
  inputSource,
  onStartCamera,
  onStopCamera,
  onUploadFile,
}) => {
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  const isGenuine = telemetry?.fusion.is_genuine ?? true;
  const verdict = isGenuine ? 'Identity Verified' : 'Verification Failed';

  // Session time formatting
  const sessionSec = telemetry?.session_time_seconds ?? 0;
  const minStr = Math.floor(sessionSec / 60)
    .toString()
    .padStart(2, '0');
  const secStr = (sessionSec % 60).toString().padStart(2, '0');

  const handleSnapshot = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, 640, 480);

    // Forensic watermark on obsidian neubrutalist panel
    ctx.fillStyle = 'rgba(10, 11, 14, 0.92)';
    ctx.fillRect(0, 444, 640, 36);
    ctx.fillStyle = '#0097A7';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.fillText('DEEPGUARD // CYBER-INTEGRITY SCANNER', 16, 466);
    ctx.fillStyle = isGenuine ? '#10B981' : '#EAB308';
    ctx.fillText(`STATUS: ${verdict}`, 440, 466);

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `deepguard_verification_${Date.now()}.png`;
    a.click();

    setSnapshotTaken(true);
    setTimeout(() => setSnapshotTaken(false), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onUploadFile) {
      onUploadFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col w-full space-y-3.5">
      {/* Video Stage: 16:10 rounded container with frosted glass border and cyber scanner */}
      <div className="relative w-full aspect-[16/10] bg-[#0A0B0E] rounded-[18px] border border-white/[0.09] hover:border-[#0097A7]/40 overflow-hidden shadow-2xl transition-all">
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" width={640} height={480} />

        {/* 1. Subtle Minimal Crosshairs in Corners of Video Container */}
        {/* Top-Left Corner Crosshair */}
        <div className="pointer-events-none absolute top-3.5 left-3.5 z-30 flex items-center justify-center">
          <div className="w-4 h-4 border-t-2 border-l-2 border-[#0097A7]" />
          <div className="absolute w-1 h-1 bg-[#EAB308] rounded-full top-0 left-0" />
        </div>
        {/* Top-Right Corner Crosshair */}
        <div className="pointer-events-none absolute top-3.5 right-3.5 z-30 flex items-center justify-center">
          <div className="w-4 h-4 border-t-2 border-r-2 border-[#0097A7]" />
          <div className="absolute w-1 h-1 bg-[#EAB308] rounded-full top-0 right-0" />
        </div>
        {/* Bottom-Left Corner Crosshair */}
        <div className="pointer-events-none absolute bottom-3.5 left-3.5 z-30 flex items-center justify-center">
          <div className="w-4 h-4 border-b-2 border-l-2 border-[#0097A7]" />
          <div className="absolute w-1 h-1 bg-[#EAB308] rounded-full bottom-0 left-0" />
        </div>
        {/* Bottom-Right Corner Crosshair */}
        <div className="pointer-events-none absolute bottom-3.5 right-3.5 z-30 flex items-center justify-center">
          <div className="w-4 h-4 border-b-2 border-r-2 border-[#0097A7]" />
          <div className="absolute w-1 h-1 bg-[#EAB308] rounded-full bottom-0 right-0" />
        </div>

        {/* Minimal Cyber Corner Ticks / Metadata */}
        <div className="pointer-events-none absolute top-3.5 left-10 text-[9px] font-mono tracking-widest text-[#0097A7]/60 z-30 uppercase select-none">
          SYS // CAM_OPTICAL_01
        </div>
        <div className="pointer-events-none absolute top-3.5 right-10 text-[9px] font-mono tracking-widest text-[#EAB308]/60 z-30 uppercase select-none">
          NODE: 0x1E3A8A
        </div>

        {/* 2. Continuous Vertical Scanning Line (Framer Motion) */}
        {isActive && (
          <motion.div
            className="pointer-events-none absolute left-0 right-0 h-[2px] z-25"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, #0097A7 20%, #67E8F9 50%, #0097A7 80%, transparent 100%)',
              boxShadow: '0 0 14px #0097A7, 0 0 28px rgba(0, 151, 167, 0.45)',
            }}
            initial={{ top: '0%' }}
            animate={{ top: ['0%', '100%'] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {/* Trailing soft laser gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#0097A7]/12 to-transparent pointer-events-none" />
          </motion.div>
        )}

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isActive ? 'opacity-100' : 'opacity-10'
          }`}
        />

        {/* Glowing Teal Cyber HUD Reticle Overlay */}
        {isActive && <FaceRoiOverlay isGenuine={isGenuine} />}

        {/* Inactive or Upload Mode Overlay */}
        {!isActive && inputSource !== 'UPLOAD_VIDEO' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0B0E14]/95 backdrop-blur-sm z-20">
            <div className="w-13 h-13 rounded-2xl bg-[#0097A7]/10 border border-[#0097A7]/30 flex items-center justify-center mb-3.5 shadow-[0_0_20px_rgba(0,151,167,0.2)]">
              <CameraOff className="w-6 h-6 text-[#0097A7]" />
            </div>
            <p className="text-sm font-semibold text-white tracking-wide">Optical Sensor Offline</p>
            <p className="text-xs text-gray-400 mt-1 mb-4 text-center max-w-sm">
              Initialize your camera feed to begin automated biometric verification.
            </p>
            <button
              onClick={onStartCamera}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0097A7] hover:bg-[#00ADC0] border border-[#0097A7] rounded-full transition-all cursor-pointer shadow-[0_0_16px_rgba(0,151,167,0.4)]"
            >
              {isLoading ? 'Connecting Sensor...' : 'Start Camera'}
            </button>
          </div>
        )}

        {/* Upload Mode UI */}
        {inputSource === 'UPLOAD_VIDEO' && (
          <label className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0B0E14]/90 backdrop-blur-sm z-20 cursor-pointer hover:bg-[#0B0E14]/80 transition-colors">
            <UploadCloud className="w-9 h-9 text-[#0097A7] mb-2 drop-shadow-[0_0_12px_rgba(0,151,167,0.5)]" />
            <span className="text-sm font-semibold text-white">Drop KYC Video File Here</span>
            <span className="text-xs text-gray-400 mt-1">Accepts MP4, WebM formats</span>
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>
        )}

        {/* Snapshot feedback pill */}
        {snapshotTaken && (
          <div className="absolute top-4 right-12 bg-[#0E1420]/90 backdrop-blur-md text-[#0097A7] border border-[#0097A7]/40 text-xs px-3.5 py-1.5 rounded-full z-30 font-medium shadow-[0_0_14px_rgba(0,151,167,0.3)]">
            Frame captured to forensic log
          </div>
        )}
      </div>

      {/* Bottom Viewport Bar: Frosted Glass Panel with Neubrutalist accents */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 frosted-glass-card rounded-[14px]">
        {/* Left: Clean Session Timer */}
        <div className="flex items-center gap-2 text-xs font-mono-tabular text-gray-400">
          <span className="w-2 h-2 rounded-full bg-[#0097A7] shadow-[0_0_8px_#0097A7]" />
          <span>
            SESSION:{' '}
            <strong className="text-gray-100 font-semibold">
              {minStr}:{secStr}
            </strong>
          </span>
        </div>

        {/* Center: Camera Actions */}
        {isActive && (
          <button
            onClick={onStopCamera}
            className="text-[11px] text-gray-400 hover:text-gray-200 px-3 py-1 rounded-full border border-white/[0.08] hover:bg-white/[0.04] transition-colors cursor-pointer"
          >
            Turn Off Camera
          </button>
        )}

        {/* Right: Snapshot & Clean Status Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSnapshot}
            className="px-3 py-1.5 text-xs text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
            title="Capture photo snapshot"
          >
            <CameraIcon className="w-3.5 h-3.5 text-gray-400" />
            <span>Take Photo</span>
          </button>

          {/* Status Pill with subtle cyber glow */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isGenuine
                ? 'bg-[#0097A7]/[0.12] text-[#0097A7] border-[#0097A7]/35 shadow-[0_0_12px_rgba(0,151,167,0.2)]'
                : 'bg-[#EAB308]/[0.12] text-[#EAB308] border-[#EAB308]/35 shadow-[0_0_12px_rgba(234,179,8,0.2)]'
            }`}
          >
            {isGenuine ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0097A7]" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-[#EAB308]" />
            )}
            <span>{isGenuine ? 'Identity Verified' : 'Verification Failed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
