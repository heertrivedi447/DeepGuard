import React, { useState } from 'react';
import { CameraOff, Camera as CameraIcon, UploadCloud, CheckCircle2, AlertTriangle } from 'lucide-react';
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

    // Forensic watermark on charcoal black
    ctx.fillStyle = 'rgba(10, 11, 14, 0.90)';
    ctx.fillRect(0, 444, 640, 36);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`DEEPGUARD VERIFICATION SNAPSHOT • STATUS: ${verdict}`, 16, 466);

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
      {/* Video Stage: 16:10 rounded container on Charcoal Black */}
      <div className="relative w-full aspect-[16/10] bg-[#0A0B0E] rounded-[16px] border border-white/[0.08] overflow-hidden shadow-xl">
        {/* Hidden Canvas for Frame Processing */}
        <canvas ref={canvasRef} className="hidden" width={640} height={480} />

        {/* Video Element */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isActive ? 'opacity-100' : 'opacity-10'
          }`}
        />

        {/* Friendly Oval Outline Overlay with "Position your face here." */}
        {isActive && (
          <FaceRoiOverlay isGenuine={isGenuine} />
        )}

        {/* Inactive or Upload Mode Overlay */}
        {!isActive && inputSource !== 'UPLOAD_VIDEO' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0E1015]/95 z-20">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
              <CameraOff className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-200">Camera Offline</p>
            <p className="text-xs text-gray-500 mt-1 mb-4 text-center max-w-sm">
              Please enable your webcam to begin face verification.
            </p>
            <button
              onClick={onStartCamera}
              className="px-4 py-2 text-xs font-medium text-white bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.12] rounded-full transition-all cursor-pointer"
            >
              {isLoading ? 'Connecting Camera...' : 'Start Camera'}
            </button>
          </div>
        )}

        {/* Upload Mode UI */}
        {inputSource === 'UPLOAD_VIDEO' && (
          <label className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0E1015]/90 z-20 cursor-pointer hover:bg-[#0E1015]/80 transition-colors">
            <UploadCloud className="w-8 h-8 text-violet-400 mb-2" />
            <span className="text-sm font-medium text-gray-200">Drop KYC Video File Here</span>
            <span className="text-xs text-gray-500 mt-1">Supports MP4, WebM</span>
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
          <div className="absolute top-3 right-3 bg-[#12141A]/90 text-emerald-400 border border-emerald-500/30 text-xs px-3.5 py-1 rounded-full z-30 font-medium shadow-md">
            Photo captured
          </div>
        )}
      </div>

      {/* Bottom Viewport Bar: Clean session timer, snapshot, and status in pill chips */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#12141A] border border-white/[0.08] rounded-xl shadow-sm">
        {/* Left: Clean Session Timer */}
        <div className="flex items-center gap-2 text-xs font-mono-tabular text-gray-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
          <span>SESSION: <strong className="text-gray-200 font-semibold">{minStr}:{secStr}</strong></span>
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

          {/* Simple binary status indicator styled like Reference 4 & 5 */}
          <div
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              isGenuine
                ? 'bg-emerald-500/[0.12] text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-[#FF5733]/[0.12] text-[#FF6B4A] border-[#FF5733]/30 shadow-[0_0_12px_rgba(255,87,51,0.2)]'
            }`}
          >
            {isGenuine ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5 text-[#FF6B4A]" />
            )}
            <span>{isGenuine ? 'Identity Verified' : 'Verification Failed'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
