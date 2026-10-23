import React, { useState } from 'react';
import { CameraOff, Camera as CameraIcon, UploadCloud, Eye, EyeOff } from 'lucide-react';
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
  const [showEyeLandmarks, setShowEyeLandmarks] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);

  const isGenuine = telemetry?.fusion.is_genuine ?? true;
  const verdict = telemetry?.fusion.verdict ?? 'GENUINE';
  const confidence = telemetry?.fusion.confidence_pct ?? 96;

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

    // Subtle forensic watermark
    ctx.fillStyle = 'rgba(11, 13, 17, 0.85)';
    ctx.fillRect(0, 444, 640, 36);
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(
      `DEEPGUARD KYC FORENSIC AUDIT • VERDICT: ${verdict} (${confidence}%) • FRAME #${telemetry?.frame_index || 0}`,
      14,
      466
    );

    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `deepguard_kyc_audit_${Date.now()}.png`;
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
    <div className="flex flex-col w-full space-y-3">
      {/* Video Stage: 16:10 rounded container (border-radius: 12px) */}
      <div className="relative w-full aspect-[16/10] bg-[#0E1118] rounded-[12px] border-hairline overflow-hidden shadow-sm">
        {/* Hidden Canvas for 40-50ms Frame Dispatcher */}
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

        {/* Non-Intrusive Overlays (Thin 1.5px corner brackets & 12 landmarks) */}
        {isActive && (
          <FaceRoiOverlay
            faceRoi={telemetry?.plane_b_ear.face_roi}
            eyeLandmarks={telemetry?.plane_b_ear.eye_landmarks}
            showEyeLandmarks={showEyeLandmarks}
            isGenuine={isGenuine}
          />
        )}

        {/* Inactive or Upload Mode Overlay */}
        {!isActive && inputSource !== 'UPLOAD_VIDEO' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0E1118]/95 z-20">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] border-hairline flex items-center justify-center mb-3">
              <CameraOff className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-300">Optical KYC Sensor Inactive</p>
            <p className="text-xs text-gray-500 mt-1 mb-4">
              Enable local webcam or run test feed to initiate multi-plane biometric verification.
            </p>
            <button
              onClick={onStartCamera}
              className="px-4 py-2 text-xs font-medium text-gray-200 bg-white/[0.08] hover:bg-white/[0.12] border-hairline rounded-lg transition-colors cursor-pointer"
            >
              {isLoading ? 'Connecting Sensor...' : 'Connect Video KYC Stream'}
            </button>
          </div>
        )}

        {/* Upload Mode UI */}
        {inputSource === 'UPLOAD_VIDEO' && (
          <label className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0E1118]/90 z-20 cursor-pointer hover:bg-[#0E1118]/80 transition-colors">
            <UploadCloud className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm font-medium text-gray-200">Drop KYC Video File Here</span>
            <span className="text-xs text-gray-500 mt-1">Supports MP4, WebM (H.264 / AV1)</span>
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
          <div className="absolute top-3 right-3 bg-black/80 text-emerald-400 border border-emerald-500/30 text-xs px-3 py-1 rounded-full z-30 font-medium">
            Forensic snapshot saved
          </div>
        )}
      </div>

      {/* Bottom Viewport Bar: Session timer, frame counter, snapshot, and calm status pill */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 px-3 py-2.5 bg-[#12161F] border-hairline rounded-lg">
        {/* Left: Session Timer & Frame Counter */}
        <div className="flex items-center gap-4 text-xs font-mono-tabular text-gray-400">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SESSION: <strong className="text-gray-200">{minStr}:{secStr}</strong></span>
          </div>
          <span>•</span>
          <div>
            <span>FRAME: <strong className="text-gray-200">#{telemetry?.frame_index || 0}</strong></span>
          </div>
        </div>

        {/* Center: Subtle Landmark Toggle & Camera Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEyeLandmarks((prev) => !prev)}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded border transition-colors cursor-pointer ${
              showEyeLandmarks
                ? 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30'
                : 'bg-white/[0.03] text-gray-400 border-white/[0.06] hover:text-gray-200'
            }`}
            title="Toggle visibility of the 12 eye contour landmarks"
          >
            {showEyeLandmarks ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{showEyeLandmarks ? '12 Eye Landmarks Active' : 'Clean Feed'}</span>
          </button>

          {isActive && (
            <button
              onClick={onStopCamera}
              className="text-[11px] text-gray-400 hover:text-gray-200 px-2 py-1 rounded border border-white/[0.06] transition-colors"
            >
              Stop Cam
            </button>
          )}
        </div>

        {/* Right: Snapshot & Calm Status Pill */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSnapshot}
            className="px-2.5 py-1 text-xs text-gray-300 bg-white/[0.04] hover:bg-white/[0.08] border-hairline rounded transition-colors cursor-pointer flex items-center gap-1.5"
            title="Export timestamped snapshot"
          >
            <CameraIcon className="w-3.5 h-3.5 text-gray-400" />
            <span>Audit Frame</span>
          </button>

          {/* Calm Status Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium border ${
              isGenuine
                ? 'bg-emerald-500/[0.08] text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/[0.08] text-red-400 border-red-500/20'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isGenuine ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            <span className="font-semibold tracking-wide">
              {isGenuine ? 'GENUINE IDENTITY' : 'SYNTHETIC SPOOF DETECTED'}
            </span>
            <span className="font-mono-tabular opacity-75">({confidence}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
