import React from 'react';

interface FaceRoiOverlayProps {
  isGenuine?: boolean;
}

export const FaceRoiOverlay: React.FC<FaceRoiOverlayProps> = ({ isGenuine = true }) => {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center select-none">
      {/* Friendly SVG Oval Guide (Reference Image 2 & 5 Aesthetic) */}
      <div className="relative w-[50%] max-w-[270px] aspect-[3/4] flex flex-col items-center justify-center">
        <svg
          viewBox="0 0 300 400"
          className="w-full h-full overflow-visible"
          fill="none"
        >
          {/* Subtle Ambient Radial Glow */}
          <ellipse
            cx="150"
            cy="195"
            rx="110"
            ry="148"
            stroke={isGenuine ? 'rgba(147, 51, 234, 0.55)' : 'rgba(255, 87, 51, 0.65)'}
            strokeWidth="2"
            strokeDasharray="6 6"
            className="transition-colors duration-300"
            style={{
              filter: isGenuine
                ? 'drop-shadow(0 0 10px rgba(147, 51, 234, 0.4))'
                : 'drop-shadow(0 0 10px rgba(255, 87, 51, 0.4))',
            }}
          />

          {/* Soft inner contour guide */}
          <ellipse
            cx="150"
            cy="195"
            rx="102"
            ry="140"
            stroke="rgba(255, 255, 255, 0.10)"
            strokeWidth="1"
          />
        </svg>

        {/* Friendly instruction text in frosted charcoal pill (Inspired by Image 4) */}
        <div className="absolute -bottom-7 left-0 right-0 flex justify-center">
          <span className="text-xs font-medium tracking-wide text-gray-200 bg-[#12141A]/90 backdrop-blur-md px-3.5 py-1 rounded-full border border-white/[0.12] shadow-lg">
            Position your face here.
          </span>
        </div>
      </div>
    </div>
  );
};
