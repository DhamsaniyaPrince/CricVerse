'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface UmpireSignalProps {
  signal: 'four' | 'six' | 'out';
  className?: string;
}

export default function UmpireSignals({ signal, className = '' }: UmpireSignalProps) {
  // Common container variant
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: 'easeOut' as const } }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className={`relative flex flex-col items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 120 150"
        className="w-32 h-40 drop-shadow-[0_0_15px_rgba(102,252,241,0.2)]"
      >
        {/* Sky backdrop glow */}
        <circle cx="60" cy="75" r="50" fill="url(#hud-radial-glow)" opacity="0.3" />

        <defs>
          <radialGradient id="hud-radial-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={signal === 'out' ? '#ff007f' : '#66fcf1'} stopOpacity="1" />
            <stop offset="100%" stopColor="#0b0c10" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Umpire Torso (White shirt with black vertical stripes) */}
        <path
          d="M 40,65 L 80,65 L 85,115 L 35,115 Z"
          fill="#ffffff"
          stroke="#1f2833"
          strokeWidth="2"
        />
        {/* Shirt Stripes */}
        <line x1="50" y1="65" x2="50" y2="115" stroke="#000000" strokeWidth="2" />
        <line x1="60" y1="65" x2="60" y2="115" stroke="#000000" strokeWidth="2" />
        <line x1="70" y1="65" x2="70" y2="115" stroke="#000000" strokeWidth="2" />
        <line x1="45" y1="65" x2="43" y2="115" stroke="#000000" strokeWidth="2" />
        <line x1="75" y1="65" x2="77" y2="115" stroke="#000000" strokeWidth="2" />

        {/* Umpire Head */}
        <circle cx="60" cy="38" r="12" fill="#ffdbac" stroke="#1f2833" strokeWidth="2" />
        {/* Sunglasses */}
        <path d="M 52,36 Q 60,40 68,36" stroke="#000" strokeWidth="3" fill="none" />
        {/* Cap (White Cap) */}
        <path d="M 46,32 Q 60,18 74,32 Z" fill="#ffffff" stroke="#1f2833" strokeWidth="1.5" />
        <path d="M 50,30 L 76,28" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />

        {/* LEFT ARM */}
        {signal === 'six' ? (
          /* SIX: Left arm raised straight up */
          <motion.g
            initial={{ rotate: 120, originX: '42px', originY: '68px' }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 60 }}
          >
            {/* Upper arm */}
            <line x1="42" y1="68" x2="42" y2="28" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
            <line x1="42" y1="68" x2="42" y2="28" stroke="#000000" strokeWidth="2" />
            {/* Hand */}
            <circle cx="42" cy="24" r="5" fill="#ffdbac" stroke="#1f2833" />
          </motion.g>
        ) : (
          /* FOUR or OUT: Left arm rests down naturally */
          <g>
            <path d="M 42,68 C 30,85 30,105 32,110" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" fill="none" />
            <circle cx="32" cy="112" r="5" fill="#ffdbac" stroke="#1f2833" />
          </g>
        )}

        {/* RIGHT ARM */}
        {signal === 'six' ? (
          /* SIX: Right arm raised straight up */
          <motion.g
            initial={{ rotate: -120, originX: '78px', originY: '68px' }}
            animate={{ rotate: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 60 }}
          >
            <line x1="78" y1="68" x2="78" y2="28" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
            <line x1="78" y1="68" x2="78" y2="28" stroke="#000000" strokeWidth="2" />
            <circle cx="78" cy="24" r="5" fill="#ffdbac" stroke="#1f2833" />
          </motion.g>
        ) : signal === 'four' ? (
          /* FOUR: Right arm sweeps horizontally side-to-side */
          <motion.g
            initial={{ rotate: -40, originX: '78px', originY: '68px' }}
            animate={{ rotate: [0, 45, -20, 45, 0] }}
            transition={{ duration: 2.2, ease: 'easeInOut' as const, repeat: Infinity }}
          >
            {/* Sweeping arm */}
            <line x1="78" y1="68" x2="110" y2="85" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
            <line x1="78" y1="68" x2="110" y2="85" stroke="#000000" strokeWidth="2" />
            <circle cx="112" cy="86" r="5" fill="#ffdbac" stroke="#1f2833" />
          </motion.g>
        ) : (
          /* OUT: Right arm raises single index finger straight up */
          <motion.g
            initial={{ scaleY: 0.5, originX: '78px', originY: '68px' }}
            animate={{ scaleY: 1 }}
            transition={{ type: 'spring', damping: 8, stiffness: 80 }}
          >
            {/* Raised arm */}
            <line x1="78" y1="68" x2="78" y2="35" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" />
            <line x1="78" y1="68" x2="78" y2="35" stroke="#000000" strokeWidth="2" />
            {/* Extended index finger hand */}
            <path
              d="M 76,33 L 76,20 C 76,18 78,18 78,20 L 78,33 Z"
              fill="#ffdbac"
              stroke="#1f2833"
              strokeWidth="1.5"
            />
            <circle cx="78" cy="33" r="5" fill="#ffdbac" stroke="#1f2833" />
          </motion.g>
        )}
      </svg>
      <span
        className={`text-xs font-black uppercase tracking-widest mt-1.5 px-3 py-1 rounded-full ${
          signal === 'out'
            ? 'bg-[#ff007f]/10 text-[#ff007f] border border-[#ff007f]/30'
            : 'bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/30'
        }`}
      >
        {signal === 'out' ? 'OUT signal' : signal === 'six' ? 'SIX signal' : 'FOUR signal'}
      </span>
    </motion.div>
  );
}
