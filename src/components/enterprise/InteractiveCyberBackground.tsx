import React, { useEffect } from 'react';
import { motion, useMotionValue, useSpring, MotionValue } from 'framer-motion';

interface InteractiveCyberBackgroundProps {
  mouseX?: MotionValue<number>;
  mouseY?: MotionValue<number>;
}

export const InteractiveCyberBackground: React.FC<InteractiveCyberBackgroundProps> = ({
  mouseX: externalMouseX,
  mouseY: externalMouseY,
}) => {
  // Internal fallback motion values if not provided externally
  const fallbackX = useMotionValue(
    typeof window !== 'undefined' ? window.innerWidth / 2 : 500
  );
  const fallbackY = useMotionValue(
    typeof window !== 'undefined' ? window.innerHeight / 3 : 300
  );

  const activeX = externalMouseX || fallbackX;
  const activeY = externalMouseY || fallbackY;

  // Smooth physics-based spring damping for organic spotlight gliding
  const springConfig = { damping: 28, stiffness: 150, mass: 0.5 };
  const smoothX = useSpring(activeX, springConfig);
  const smoothY = useSpring(activeY, springConfig);

  useEffect(() => {
    // If external values aren't passed, listen globally as fallback
    if (!externalMouseX || !externalMouseY) {
      const handlePointerMove = (e: PointerEvent) => {
        activeX.set(e.clientX);
        activeY.set(e.clientY);
      };
      window.addEventListener('pointermove', handlePointerMove, { passive: true });
      return () => window.removeEventListener('pointermove', handlePointerMove);
    }
  }, [externalMouseX, externalMouseY, activeX, activeY]);

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none">
      {/* Subtle Digital Cyber Matrix Grid */}
      <div className="absolute inset-0 cyber-grid-pattern opacity-30" />

      {/* Primary Reactive Spotlight: Vibrant Teal (#0097A7) to Deep Indigo (#1E3A8A) */}
      <motion.div
        className="absolute top-0 left-0 w-[800px] h-[800px] rounded-full blur-[110px] opacity-35"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
          background:
            'radial-gradient(circle, rgba(0, 151, 167, 0.28) 0%, rgba(30, 58, 138, 0.22) 40%, rgba(10, 11, 14, 0) 70%)',
        }}
      />

      {/* Secondary Focused Core Glow: Vibrant Teal (#0097A7) */}
      <motion.div
        className="absolute top-0 left-0 w-[360px] h-[360px] rounded-full blur-[75px] opacity-25"
        style={{
          x: smoothX,
          y: smoothY,
          translateX: '-50%',
          translateY: '-50%',
          background:
            'radial-gradient(circle, #0097A7 0%, #1E3A8A 60%, transparent 80%)',
        }}
      />

      {/* Ambient Deep Indigo Accent in upper corner */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#1E3A8A]/15 blur-[120px]" />
      {/* Ambient Gold Accent in bottom right corner */}
      <div className="absolute -bottom-32 -right-32 w-80 h-80 rounded-full bg-[#EAB308]/10 blur-[120px]" />
    </div>
  );
};
