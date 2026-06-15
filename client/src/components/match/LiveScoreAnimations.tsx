'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UmpireSignals from './UmpireSignals';
import { audioService } from '@/utils/audioService';

export interface ScorerEvent {
  id: string;
  runs: number;
  isExtra: boolean;
  extraType?: string;
  extraRuns?: number;
  isWicket: boolean;
  wicketType?: string;
  batsmanOutId?: string;
  strikerId?: string;
  strikerName?: string;
  batsmanOutName?: string;
}

interface LiveScoreAnimationsProps {
  event: ScorerEvent | null;
  onClear: () => void;
}

interface Floater {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
}

// Particle class for canvas fireworks
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 1.5; // Slight upward bias
    this.color = color;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.015 + 0.01;
    this.size = Math.random() * 3 + 2;
  }

  update(gravity: number) {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += gravity; // Gravity pull
    this.vx *= 0.98; // Friction
    this.vy *= 0.98;
    this.alpha -= this.decay;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function LiveScoreAnimations({ event, onClear }: LiveScoreAnimationsProps) {
  const [activeAnim, setActiveAnim] = useState<'four' | 'six' | 'wicket' | 'runs' | 'extra' | null>(null);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  // Spawns floaters at randomized horizontal positions near the center
  const addFloater = (text: string, color: string) => {
    const id = Math.random().toString(36).substring(2, 11);
    const x = Math.floor(Math.random() * 60) - 30; // offset from center
    const y = -10;
    setFloaters((prev) => [...prev, { id, text, color, x, y }]);
    setTimeout(() => {
      setFloaters((prev) => prev.filter((f) => f.id !== id));
    }, 1200);
  };

  // Trigger animations based on scorer events
  useEffect(() => {
    if (!event) return;

    const { runs, isExtra, extraType, isWicket } = event;

    // 1. WICKET ANIMATION
    if (isWicket) {
      setTimeout(() => setActiveAnim('wicket'), 0);
      audioService.playWicketSound();
      const timer = setTimeout(() => {
        setActiveAnim(null);
        onClear();
      }, 3800);
      return () => clearTimeout(timer);
    }

    // 2. BOUNDARY SIX ANIMATION
    if (!isExtra && runs === 6) {
      setTimeout(() => setActiveAnim('six'), 0);
      audioService.playBoundarySound(true);
      const timer = setTimeout(() => {
        setActiveAnim(null);
        onClear();
      }, 4500);
      return () => clearTimeout(timer);
    }

    // 3. BOUNDARY FOUR ANIMATION
    if (!isExtra && runs === 4) {
      setTimeout(() => setActiveAnim('four'), 0);
      audioService.playBoundarySound(false);
      const timer = setTimeout(() => {
        setActiveAnim(null);
        onClear();
      }, 3500);
      return () => clearTimeout(timer);
    }

    // 4. EXTRAS FLOATING INDICATOR
    if (isExtra && (extraType === 'wide' || extraType === 'no-ball')) {
      setTimeout(() => setActiveAnim('extra'), 0);
      audioService.playRunsSound();
      
      const label = extraType === 'wide' ? 'WIDE +1' : 'NO BALL +1';
      const color = extraType === 'wide' ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : 'text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.6)]';
      
      addFloater(label, color);
      
      const timer = setTimeout(() => {
        setActiveAnim(null);
        onClear();
      }, 1500);
      return () => clearTimeout(timer);
    }

    // 5. REGULAR RUNS FLOATING INDICATOR (1, 2, 3)
    if (!isExtra && runs > 0 && runs < 4) {
      setTimeout(() => setActiveAnim('runs'), 0);
      audioService.playRunsSound();
      
      addFloater(`+${runs}`, 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]');
      
      const timer = setTimeout(() => {
        setActiveAnim(null);
        onClear();
      }, 1200);
      return () => clearTimeout(timer);
    }

    // Default fallback
    onClear();
  }, [event]);

  // Canvas fireworks loop
  useEffect(() => {
    if (activeAnim !== 'six') {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Match canvas width/height to window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let particles: Particle[] = [];
    const colors = ['#66fcf1', '#39ff14', '#ff007f', '#ffea00', '#ffffff', '#a855f7'];
    const gravity = 0.08;

    const spawnFirework = () => {
      const x = Math.random() * (canvas.width * 0.6) + canvas.width * 0.2;
      const y = Math.random() * (canvas.height * 0.4) + canvas.height * 0.15;
      const fireworkColor = colors[Math.floor(Math.random() * colors.length)];
      
      for (let i = 0; i < 60; i++) {
        particles.push(new Particle(x, y, fireworkColor));
      }
    };

    // Initial fireworks
    spawnFirework();
    // Periodically spawn fireworks during the SIX screen display
    const spawnInterval = setInterval(spawnFirework, 700);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update & draw particles
      particles = particles.filter((p) => p.alpha > 0);
      particles.forEach((p) => {
        p.update(gravity);
        p.draw(ctx);
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      clearInterval(spawnInterval);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [activeAnim]);

  return (
    <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
      {/* FLOATING TEXT NOTIFICATIONS (+1, +2, WIDE +1) */}
      <div className="absolute top-[35%] left-1/2 -translate-x-1/2 flex flex-col items-center">
        <AnimatePresence>
          {floaters.map((f) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 15, scale: 0.7, x: f.x }}
              animate={{ opacity: 1, y: -90, scale: 1.25 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 1.1, ease: 'easeOut' }}
              className={`absolute font-black font-mono text-4xl select-none ${f.color}`}
            >
              {f.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {/* FOUR BOUNDARY PANEL */}
        {activeAnim === 'four' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-auto"
          >
            {/* Pulsing neon frame */}
            <motion.div
              initial={{ scale: 0.8, rotate: -2 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8 }}
              className="glass-card max-w-lg w-full p-8 border-[#66fcf1]/30 neon-shadow-cyan text-center flex flex-col items-center space-y-6 relative overflow-hidden"
            >
              <div className="absolute -left-10 top-0 w-32 h-full bg-cyan-500/10 skew-x-12 animate-pulse"></div>
              
              <motion.h1
                animate={{ scale: [1, 1.15, 1], textShadow: ['0 0 8px #66fcf1', '0 0 25px #66fcf1', '0 0 8px #66fcf1'] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="text-6xl font-black italic tracking-widest text-[#66fcf1]"
              >
                FOUR!
              </motion.h1>

              {/* Umpire SVG Signal */}
              <UmpireSignals signal="four" />

              {/* Batsman name highlight */}
              {event?.strikerName && (
                <div className="text-sm font-bold text-gray-300 uppercase tracking-widest bg-[#1f2833]/85 px-6 py-2 rounded-xl border border-white/5 font-sans">
                  Struck by <strong className="text-white font-black">{event.strikerName}</strong>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* SIX FULL SCREEN FIREWORKS */}
        {activeAnim === 'six' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-md pointer-events-auto"
          >
            {/* Screen Flash Overlay */}
            <motion.div
              animate={{ opacity: [0, 0.45, 0] }}
              transition={{ duration: 0.6, repeat: 4 }}
              className="absolute inset-0 bg-cyan-400 pointer-events-none"
            />

            {/* Firework Canvas */}
            <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

            <motion.div
              initial={{ scale: 0.6, y: 50 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: 'spring', damping: 10, stiffness: 60 }}
              className="z-10 flex flex-col items-center space-y-6 text-center select-none"
            >
              <motion.h1
                animate={{ scale: [1, 1.2, 1], rotate: [-1, 2, -1] }}
                transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut' }}
                className="text-8xl font-black italic tracking-widest text-[#39ff14] drop-shadow-[0_0_20px_rgba(57,255,20,0.8)]"
              >
                SIX!
              </motion.h1>

              {/* Umpire SVG Signal */}
              <UmpireSignals signal="six" />

              {/* Batsman name highlight */}
              {event?.strikerName && (
                <div className="text-sm font-bold text-gray-300 uppercase tracking-widest bg-[#1f2833]/90 px-6 py-2.5 rounded-xl border border-[#39ff14]/30 font-sans neon-glow-green">
                  Massive Hit by <strong className="text-white font-black">{event.strikerName}</strong>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}

        {/* OUT WICKET SCREEN ANIMATION */}
        {activeAnim === 'wicket' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="glass-card max-w-lg w-full p-8 border-[#ff007f]/30 neon-shadow-magenta text-center flex flex-col items-center space-y-6 relative overflow-hidden"
            >
              {/* Out red banners */}
              <motion.h1
                animate={{ scale: [1, 1.15, 1], y: [0, -3, 0] }}
                transition={{ duration: 1.0, repeat: Infinity }}
                className="text-6xl font-black tracking-widest text-[#ff007f] drop-shadow-[0_0_12px_rgba(255,0,127,0.7)]"
              >
                OUT!
              </motion.h1>

              {/* Breaking Stumps Vector Animation */}
              <div className="relative w-48 h-28 flex items-end justify-center border-b-4 border-gray-700 pb-0.5">
                {/* Left Stump */}
                <motion.rect
                  width="7"
                  height="75"
                  x="-35"
                  fill="#c2410c"
                  stroke="#1f2833"
                  className="absolute"
                  animate={{ rotate: -8, x: -38 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />
                
                {/* Middle Stump */}
                <motion.rect
                  width="7"
                  height="75"
                  x="0"
                  fill="#c2410c"
                  stroke="#1f2833"
                  className="absolute"
                  animate={{ rotate: 32, x: 22, y: 15 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />

                {/* Right Stump */}
                <motion.rect
                  width="7"
                  height="75"
                  x="35"
                  fill="#c2410c"
                  stroke="#1f2833"
                  className="absolute"
                  animate={{ rotate: 12, x: 42 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                />

                {/* Left Bail */}
                <motion.rect
                  width="36"
                  height="6"
                  fill="#ea580c"
                  className="absolute"
                  style={{ top: '25px', left: '38px' }}
                  animate={{ y: -80, x: -45, rotate: -220, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />

                {/* Right Bail */}
                <motion.rect
                  width="36"
                  height="6"
                  fill="#ea580c"
                  className="absolute"
                  style={{ top: '25px', left: '76px' }}
                  animate={{ y: -90, x: 40, rotate: 290, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                />
              </div>

              {/* Umpire SVG Signal */}
              <UmpireSignals signal="out" />

              {/* Dismissed Batsman */}
              {event?.batsmanOutName && (
                <div className="text-sm font-bold text-gray-300 uppercase tracking-widest bg-[#1f2833]/90 px-6 py-2 rounded-xl border border-[#ff007f]/30 font-sans">
                  Departed: <strong className="text-white font-black">{event.batsmanOutName}</strong> ({event.wicketType || 'Dismissed'})
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
