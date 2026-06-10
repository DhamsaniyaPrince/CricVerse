'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimateScoreProps {
  runs: number;
  wickets: number;
  className?: string;
  runsClassName?: string;
  wicketsClassName?: string;
}

export default function AnimateScore({
  runs,
  wickets,
  className = '',
  runsClassName = '',
  wicketsClassName = ''
}: AnimateScoreProps) {
  const [displayRuns, setDisplayRuns] = useState(runs);
  const [pulseRuns, setPulseRuns] = useState(false);
  const [pulseWickets, setPulseWickets] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Animate runs count-up
  useEffect(() => {
    if (runs === displayRuns) return;

    if (runs < displayRuns) {
      // Immediate snap on undo / reset
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayRuns(runs);
      return;
    }

    const diff = runs - displayRuns;
    // Complete the count-up within 500-800ms
    const stepTime = Math.max(50, Math.floor(600 / diff));

    if (timerRef.current) clearInterval(timerRef.current);

    setPulseRuns(true);
    timerRef.current = setInterval(() => {
      setDisplayRuns((prev) => {
        if (prev >= runs) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => setPulseRuns(false), 200);
          return runs;
        }
        return prev + 1;
      });
    }, stepTime);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [runs]);

  // Pulse wickets on change
  const prevWickets = useRef(wickets);
  useEffect(() => {
    if (wickets !== prevWickets.current) {
      prevWickets.current = wickets;
      setPulseWickets(true);
      const t = setTimeout(() => setPulseWickets(false), 500);
      return () => clearTimeout(t);
    }
  }, [wickets]);

  return (
    <div className={`flex items-baseline space-x-1 ${className}`}>
      {/* Animated Runs */}
      <motion.span
        animate={pulseRuns ? { scale: [1, 1.25, 1], color: ['#ffffff', '#66fcf1', '#ffffff'] } : { scale: 1 }}
        transition={{ duration: 0.3 }}
        className={`font-black tracking-tight inline-block font-mono ${runsClassName}`}
      >
        {displayRuns}
      </motion.span>

      {/* Separator / */}
      <span className="text-white mx-0.5 select-none font-bold">/</span>

      {/* Animated Wickets */}
      <motion.span
        animate={pulseWickets ? { scale: [1, 1.4, 1], color: ['#ffffff', '#ff007f', '#ffffff'] } : { scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`font-black tracking-tight inline-block font-mono ${wicketsClassName}`}
      >
        {wickets}
      </motion.span>
    </div>
  );
}
