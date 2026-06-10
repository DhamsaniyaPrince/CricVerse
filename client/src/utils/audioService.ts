// Web Audio API Synthesizer Service for CricVerse
// Generates dynamic, lightweight sound effects without loading external files

let audioCtx: AudioContext | null = null;
let isMuted = true;

// Initialize mute state from localStorage (default to muted for autoplay policies)
if (typeof window !== 'undefined') {
  isMuted = localStorage.getItem('cricverse_muted') !== 'false'; // default is true (muted)
}

const getAudioContext = (): AudioContext => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Generates white noise for crowd sounds
const createNoiseBuffer = (ctx: AudioContext, duration: number): AudioBuffer => {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
};

export const audioService = {
  getMuteState: () => isMuted,
  
  setMuteState: (mute: boolean) => {
    isMuted = mute;
    if (typeof window !== 'undefined') {
      localStorage.setItem('cricverse_muted', String(mute));
    }
    // Resume context if unmuting
    if (!mute) {
      try {
        getAudioContext();
      } catch (e) {
        console.error('Failed to initialize AudioContext:', e);
      }
    }
  },

  // Dynamic blip chime for single runs
  playRunsSound: () => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // Create oscillator and gain node
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.15); // A5

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  },

  // Bandpass-filtered crowd cheer for boundaries (Fours and Sixes)
  playBoundarySound: (isSix = false) => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;
      const duration = isSix ? 4.5 : 3.0;

      // 1. Crowd Cheering Noise Generator
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = createNoiseBuffer(ctx, duration);

      // Bandpass Filter to shape the crowd frequency spectrum
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(1.5, now);
      filter.frequency.setValueAtTime(450, now);
      // Sweeping the frequency up and down simulates waves of cheers
      filter.frequency.exponentialRampToValueAtTime(950, now + 0.5);
      filter.frequency.linearRampToValueAtTime(650, now + 1.8);
      filter.frequency.exponentialRampToValueAtTime(400, now + duration);

      // Gain Envelope
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.3); // rapid fade-in
      gain.gain.exponentialRampToValueAtTime(0.15, now + 1.2); // slight drop
      gain.gain.linearRampToValueAtTime(0.15, now + duration - 1.0); // sustain
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration); // fade-out

      // 2. Extra cheering synthesizer whistle/siren for sixes
      if (isSix) {
        const whistleOsc = ctx.createOscillator();
        const whistleGain = ctx.createGain();
        
        whistleOsc.type = 'triangle';
        whistleOsc.frequency.setValueAtTime(440, now);
        whistleOsc.frequency.linearRampToValueAtTime(784, now + 0.4); // sweep up
        whistleOsc.frequency.exponentialRampToValueAtTime(523.25, now + 1.2);
        
        whistleGain.gain.setValueAtTime(0.001, now);
        whistleGain.gain.linearRampToValueAtTime(0.03, now + 0.3);
        whistleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        
        whistleOsc.connect(whistleGain);
        whistleGain.connect(ctx.destination);
        
        whistleOsc.start(now);
        whistleOsc.stop(now + 1.6);
      }

      noiseNode.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  },

  // Wicket impact followed by crowd disappointment sigh
  playWicketSound: () => {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      const now = ctx.currentTime;

      // 1. Stump Impact sound (deep thud)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.15); // rapid pitch drop

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.22);

      // 2. Crowd gasp / sigh (lowered pitch noise slide)
      const duration = 2.5;
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = createNoiseBuffer(ctx, duration);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.linearRampToValueAtTime(250, now + 1.0); // pitch droop

      const crowdGain = ctx.createGain();
      crowdGain.gain.setValueAtTime(0.001, now + 0.05); // slight delay after impact
      crowdGain.gain.linearRampToValueAtTime(0.18, now + 0.3); // gasp
      crowdGain.gain.exponentialRampToValueAtTime(0.001, now + duration); // disappointment fade-out

      noiseNode.connect(filter);
      filter.connect(crowdGain);
      crowdGain.connect(ctx.destination);

      noiseNode.start(now + 0.05);
      noiseNode.stop(now + duration);
    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  }
};
