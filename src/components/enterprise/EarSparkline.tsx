import React from 'react';

interface EarSparklineProps {
  history: number[]; // 30 frames
  threshold?: number; // 0.22
  currentVal: number;
  isBlinking: boolean;
}

export const EarSparkline: React.FC<EarSparklineProps> = ({
  history,
  threshold = 0.22,
  currentVal,
  isBlinking,
}) => {
  const width = 240;
  const height = 48;
  const paddingY = 6;

  // Scale: 0.10 (bottom) to 0.40 (top)
  const minY = 0.10;
  const maxY = 0.40;

  const getY = (val: number) => {
    const clamped = Math.min(maxY, Math.max(minY, val));
    const ratio = (clamped - minY) / (maxY - minY);
    return height - paddingY - ratio * (height - paddingY * 2);
  };

  const thresholdY = getY(threshold);

  const points = history
    .map((val, idx) => {
      const x = (idx / (Math.max(1, history.length - 1))) * width;
      const y = getY(val);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const currentY = getY(currentVal);

  return (
    <div className="relative w-full h-12 flex flex-col justify-center">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Horizontal Dashed Reference Line at threshold = 0.22 */}
        <line
          x1={0}
          y1={thresholdY}
          x2={width}
          y2={thresholdY}
          stroke="rgba(245, 158, 11, 0.45)"
          strokeWidth="1"
          strokeDasharray="3 3"
        />

        {/* Rolling 30-Frame Line */}
        <polyline
          fill="none"
          stroke={isBlinking ? '#F59E0B' : '#10B981'}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points}
          className="transition-colors duration-150"
        />

        {/* Current Head Dot */}
        <circle
          cx={width}
          cy={currentY}
          r={isBlinking ? 3 : 2.5}
          fill={isBlinking ? '#F59E0B' : '#10B981'}
        />
      </svg>

      {/* Threshold micro-label */}
      <span
        className="absolute right-1 text-[9px] font-mono-tabular font-medium text-amber-500/70 pointer-events-none select-none"
        style={{ top: `${thresholdY - 14}px` }}
      >
        th: 0.22
      </span>
    </div>
  );
};
