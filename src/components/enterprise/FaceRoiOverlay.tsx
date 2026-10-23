import React from 'react';
import type { EyeLandmark, FaceROI } from '../../services/types';

interface FaceRoiOverlayProps {
  faceRoi?: FaceROI;
  eyeLandmarks?: EyeLandmark[];
  showEyeLandmarks: boolean;
  isGenuine: boolean;
}

export const FaceRoiOverlay: React.FC<FaceRoiOverlayProps> = ({
  faceRoi,
  eyeLandmarks = [],
  showEyeLandmarks,
  isGenuine,
}) => {
  if (!faceRoi) return null;

  // Face bounding box percentages
  const left = faceRoi.x * 100;
  const top = faceRoi.y * 100;
  const width = faceRoi.width * 100;
  const height = faceRoi.height * 100;

  const bracketColor = isGenuine
    ? 'border-emerald-400/80 text-emerald-400'
    : 'border-red-400/80 text-red-400';

  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden select-none">
      {/* Subtle Center Face Alignment Silhouette Guide */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[42%] h-[68%] rounded-[50%/60%] border border-dashed border-white/30" />
      </div>

      {/* Thin 1.5px Corner L-Brackets around Face ROI */}
      <div
        className="absolute transition-all duration-150 ease-out"
        style={{
          left: `${left}%`,
          top: `${top}%`,
          width: `${width}%`,
          height: `${height}%`,
        }}
      >
        {/* Top-Left Bracket */}
        <div
          className={`absolute top-0 left-0 w-3 h-3 border-t-[1.5px] border-l-[1.5px] ${bracketColor}`}
        />
        {/* Top-Right Bracket */}
        <div
          className={`absolute top-0 right-0 w-3 h-3 border-t-[1.5px] border-r-[1.5px] ${bracketColor}`}
        />
        {/* Bottom-Left Bracket */}
        <div
          className={`absolute bottom-0 left-0 w-3 h-3 border-b-[1.5px] border-l-[1.5px] ${bracketColor}`}
        />
        {/* Bottom-Right Bracket */}
        <div
          className={`absolute bottom-0 right-0 w-3 h-3 border-b-[1.5px] border-r-[1.5px] ${bracketColor}`}
        />

        {/* Quiet ROI Tag */}
        <div className="absolute -top-5 left-0 flex items-center gap-1.5 font-mono-tabular text-[10px] text-gray-400">
          <span className="bg-black/60 px-1 py-0.5 rounded border border-white/10">
            ROI: {(faceRoi.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 12-Point Eye Landmarks (p1..p6) only when toggle is active */}
      {showEyeLandmarks &&
        eyeLandmarks.map((landmark, idx) => (
          <div
            key={idx}
            className="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full bg-cyan-400/90 shadow-[0_0_4px_rgba(0,229,255,0.6)] transition-all duration-100"
            style={{
              left: `${landmark.x * 100}%`,
              top: `${landmark.y * 100}%`,
            }}
            title={`${landmark.eye} ${landmark.id}`}
          />
        ))}
    </div>
  );
};
