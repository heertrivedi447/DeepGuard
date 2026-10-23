import React from 'react';

interface FaceRoiOverlayProps {
  isGenuine?: boolean;
}

export const FaceRoiOverlay: React.FC<FaceRoiOverlayProps> = ({ isGenuine = true }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center select-none">
      {/* Friendly SVG Oval Guide */}
      <div className="relative w-[52%] max-w-[280px] aspect-[3/4] flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 300 400"
          className="w-full h-full overflow-visible"
          fill="none"
        >
          {/* Subtle Outer Glow / Stroke */}
          <ellipse
            cx="150"
            cy="195"
            rx="110"
            ry="150"
            stroke={isGenuine ? 'rgba(16, 185, 129, 0.65)' : 'rgba(239, 68, 68, 0.65)'}
            strokeWidth="2"
            strokeDasharray="6 6"
            className="transition-colors duration-300"
          />

          {/* Soft inner corner ticks */}
          <ellipse
            cx="150"
            cy="195"
            rx="102"
            ry="142"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />
        </svg>

        {/* Friendly instruction text */}
        <div className="absolute -bottom-7 left-0 right-0 flex justify-center">
          <span className="text-xs font-medium tracking-wide text-gray-200 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full border border-white/10 shadow-sm">
            Position your face here.
          </span>
        </div>
      </div>
    </div>
  );
};
