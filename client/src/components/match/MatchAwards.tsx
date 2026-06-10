'use client';

import React, { useEffect, useRef } from 'react';
import { 
  Trophy, Medal, Flame, Shield, Target, Zap, 
  Share2, Download, Award, Users, ChevronRight, Activity 
} from 'lucide-react';

interface AwardDetail {
  player?: string;
  name: string;
  teamName: string;
  runs?: number;
  balls?: number;
  wickets?: number;
  catches?: number;
  runOuts?: number;
  stumpings?: number;
  strikeRate?: number;
  sixes?: number;
  fours?: number;
  economy?: number;
  overs?: number;
  score?: number;
}

interface PartnershipDetail {
  batsman1: string;
  batsman2: string;
  runs: number;
}

interface AwardsData {
  playerOfMatch?: AwardDetail[];
  highestRunScorer?: AwardDetail[];
  bestBowler?: AwardDetail[];
  bestFielder?: AwardDetail[];
  fastestScorer?: AwardDetail[];
  mostSixes?: AwardDetail[];
  mostFours?: AwardDetail[];
  bestPartnership?: PartnershipDetail;
  bestAllRounder?: AwardDetail[];
  gameChanger?: AwardDetail[];
  economyKing?: AwardDetail[];
  emergingPlayer?: AwardDetail[];
}

interface Match {
  _id: string;
  title: string;
  venue: string;
  date: string;
  score: {
    teamA: { runs: number; wickets: number; overs: number };
    teamB: { runs: number; wickets: number; overs: number };
  };
  teamA: { name: string };
  teamB: { name: string };
  awards?: AwardsData;
}

export default function MatchAwards({ match }: { match: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const awards = match.awards;

  // Simple Canvas Confetti implementation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const colors = ['#66fcf1', '#39ff14', '#ff007f', '#ffcc00', '#00e5ff'];
    const particleCount = 120;
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 5 + 3,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      let activeParticles = 0;
      particles.forEach((p) => {
        if (p.y < height) {
          activeParticles++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();

          p.x += p.speedX;
          p.y += p.speedY;
          p.rotation += p.rotationSpeed;
        }
      });

      if (activeParticles > 0) {
        animationFrameId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (!awards || Object.keys(awards).length === 0) {
    return (
      <div className="glass-card p-12 text-center border-[#66fcf1]/10 max-w-xl mx-auto space-y-4">
        <Trophy className="w-12 h-12 text-gray-500 mx-auto animate-pulse" />
        <h3 className="text-lg font-bold text-white uppercase tracking-wider">No Awards Compiled</h3>
        <p className="text-gray-400 text-xs">
          Match award metrics are generated automatically once scoring is finalized and the match is marked as COMPLETED.
        </p>
      </div>
    );
  }

  const potm = awards.playerOfMatch && awards.playerOfMatch[0];

  const handleShare = () => {
    if (!potm) return;
    const shareText = `🏆 CricVerse Match Awards - ${match.title}\n\n🥇 Player of the Match: ${potm.name} (${potm.teamName}) - MVP score: ${potm.score}\n🏏 Runs: ${potm.runs} | 🎳 Wickets: ${potm.wickets}\n\nCheck out full match stats on CricVerse!`;
    navigator.clipboard.writeText(shareText);
    alert('Match Awards summary copied to clipboard!');
  };

  const handleDownloadImage = () => {
    if (!potm) return;
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background gradient
    const grad = ctx.createLinearGradient(0, 0, 800, 600);
    grad.addColorStop(0, '#0b0c10');
    grad.addColorStop(1, '#1f2833');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 800, 600);

    // Draw grid border lines (cyberpunk style)
    ctx.strokeStyle = 'rgba(102, 252, 241, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 600);
      ctx.stroke();
    }
    for (let j = 0; j < 600; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(800, j);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, 760, 560);

    // Header branding
    ctx.fillStyle = '#66fcf1';
    ctx.font = 'bold 22px Helvetica';
    ctx.fillText('CRICVERSE PREMIER ACCLAIMS', 50, 60);

    ctx.fillStyle = '#ffffff';
    ctx.font = '14px Helvetica';
    ctx.fillText(match.title.toUpperCase(), 50, 85);

    // Main Certificate Card
    ctx.fillStyle = 'rgba(31, 40, 51, 0.8)';
    ctx.fillRect(50, 120, 700, 220);
    ctx.strokeStyle = 'rgba(102, 252, 241, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 120, 700, 220);

    // GoldPOTM Border tag
    ctx.fillStyle = '#66fcf1';
    ctx.fillRect(50, 120, 6, 220);

    // POTM Title
    ctx.fillStyle = '#66fcf1';
    ctx.font = 'bold 12px Helvetica';
    ctx.fillText('PLAYER OF THE MATCH', 80, 155);

    // POTM Name & Team
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Helvetica';
    ctx.fillText(potm.name.toUpperCase(), 80, 205);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 16px Helvetica';
    ctx.fillText(potm.teamName.toUpperCase(), 80, 235);

    // Stats
    ctx.fillStyle = '#66fcf1';
    ctx.font = 'bold 18px Helvetica';
    ctx.fillText(`${potm.runs} Runs  |  ${potm.wickets} Wickets  |  ${potm.catches} Fielding Dismissals`, 80, 275);

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = 'Helvetica';
    ctx.fillText(`MVP Rating Score: ${potm.score} pts`, 80, 305);

    // Sub Awards grid (Top 4 other awards)
    const drawSubAward = (x: number, y: number, title: string, winner: string, stat: string) => {
      ctx.fillStyle = 'rgba(31, 40, 51, 0.5)';
      ctx.fillRect(x, y, 335, 80);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.strokeRect(x, y, 335, 80);

      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = 'bold 10px Helvetica';
      ctx.fillText(title.toUpperCase(), x + 15, y + 25);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px Helvetica';
      ctx.fillText(winner.toUpperCase(), x + 15, y + 48);

      ctx.fillStyle = '#66fcf1';
      ctx.font = 'bold 11px Helvetica';
      ctx.fillText(stat, x + 15, y + 65);
    };

    const runScorer = awards.highestRunScorer?.[0];
    const bowler = awards.bestBowler?.[0];
    const fielder = awards.bestFielder?.[0];
    const economy = awards.economyKing?.[0];

    drawSubAward(
      50, 370, 'Highest Run Scorer',
      runScorer ? runScorer.name : 'N/A',
      runScorer ? `${runScorer.runs} runs (${runScorer.balls} balls)` : ''
    );
    drawSubAward(
      415, 370, 'Best Bowler',
      bowler ? bowler.name : 'N/A',
      bowler ? `${bowler.wickets} Wkts / ${bowler.runs} Runs` : ''
    );
    drawSubAward(
      50, 470, 'Best Fielder',
      fielder ? fielder.name : 'N/A',
      fielder ? `${fielder.catches} Catches, ${fielder.runOuts} Run Outs` : ''
    );
    drawSubAward(
      415, 470, 'Economy King',
      economy ? economy.name : 'N/A',
      economy ? `${economy.economy} Econ (${economy.overs} overs)` : ''
    );

    // Download trigger
    const link = document.createElement('a');
    link.download = `match_awards_${match._id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const renderAwardList = (list: AwardDetail[] | undefined, fallbackText = 'N/A') => {
    if (!list || list.length === 0) return <span className="text-gray-600 italic">{fallbackText}</span>;
    return (
      <div className="space-y-1">
        {list.map((item, idx) => (
          <div key={idx} className="flex justify-between items-center text-white font-bold text-xs uppercase font-sans">
            <span className="truncate max-w-[150px]">{item.name}</span>
            <span className="text-gray-400 text-[9px] font-normal truncate max-w-[90px]">{item.teamName}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="relative space-y-8 select-none">
      {/* Confetti Overlay */}
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-50 w-full h-full" />

      {/* Buttons Deck */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#66fcf1]/10 pb-4">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <Trophy className="w-6 h-6 text-[#66fcf1]" />
            <span>Championship Match Awards</span>
          </h2>
          <p className="text-xs text-gray-500">DYNAMIC PLAYER & TEAM PERFORMANCE ACCOLADES</p>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleShare}
            className="flex items-center space-x-1.5 px-4 py-2 border border-[#66fcf1]/20 hover:border-[#66fcf1] rounded-xl text-xs font-bold text-gray-300 hover:text-white transition cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-[#66fcf1]" />
            <span>Share Summary</span>
          </button>
          <button
            onClick={handleDownloadImage}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#66fcf1] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 rounded-xl text-xs font-bold text-[#0b0c10] shadow-lg shadow-[#66fcf1]/10 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Certificate</span>
          </button>
        </div>
      </div>

      {/* Grid: POTM Featured & Mini Accolades */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Featured POTM Card */}
        {potm && (
          <div className="glass-card border-[#66fcf1]/30 p-6 flex flex-col justify-between h-full bg-gradient-to-br from-[#1f2833]/60 via-[#0b0c10]/90 to-[#66fcf1]/5 relative overflow-hidden shadow-[0_0_30px_rgba(102,252,241,0.08)] group lg:col-span-1 min-h-[420px]">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#66fcf1]/10 to-transparent rounded-bl-full pointer-events-none" />
            
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <span className="text-[10px] uppercase font-mono font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1">
                  <Medal className="w-3.5 h-3.5 text-yellow-500 animate-spin" style={{ animationDuration: '4s' }} />
                  <span>PREMIER MVP</span>
                </span>
                <span className="text-[10px] font-mono font-bold text-gray-500">MVP SCORE: {potm.score} pts</span>
              </div>

              {/* Player Silhouette & Profile info */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#66fcf1]/20 to-[#1f2833] flex items-center justify-center border border-[#66fcf1]/30 overflow-hidden shadow-lg group-hover:scale-105 transition duration-300">
                  <Trophy className="w-10 h-10 text-[#66fcf1]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase text-white tracking-wide">{potm.name}</h3>
                  <p className="text-[#66fcf1] font-bold text-xs uppercase tracking-wider">{potm.teamName}</p>
                </div>
              </div>

              {/* Summary stat board */}
              <div className="bg-[#0b0c10]/50 border border-white/5 rounded-xl p-4 space-y-2.5 font-mono text-xs text-gray-400">
                <div className="flex justify-between">
                  <span>Batting Contribution:</span>
                  <strong className="text-white">{potm.runs} Runs</strong>
                </div>
                <div className="flex justify-between">
                  <span>Bowling Contribution:</span>
                  <strong className="text-white">{potm.wickets} Wickets</strong>
                </div>
                <div className="flex justify-between">
                  <span>Fielding Dismissals:</span>
                  <strong className="text-white">{potm.catches} catches</strong>
                </div>
              </div>
            </div>

            <div className="border-t border-white/5 pt-4 mt-6">
              <div className="p-3 bg-[#66fcf1]/5 rounded-xl border border-[#66fcf1]/10 text-[10px] leading-relaxed text-gray-400 uppercase font-bold text-center">
                🏆 Outstanding performance. Player of the Match honors awarded.
              </div>
            </div>
          </div>
        )}

        {/* Small Accolades Cards Grid */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {/* Highest Run Scorer */}
          <div className="glass-card p-4 border-white/5 hover:border-orange-500/20 hover:bg-orange-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-orange-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Highest Scorer</span>
              <Flame className="w-4 h-4 text-orange-500" />
            </div>
            {renderAwardList(awards.highestRunScorer)}
            {awards.highestRunScorer?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                {awards.highestRunScorer[0].runs} RUNS ({awards.highestRunScorer[0].balls}b)
              </span>
            )}
          </div>

          {/* Best Bowler */}
          <div className="glass-card p-4 border-white/5 hover:border-pink-500/20 hover:bg-pink-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-pink-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Best Bowler</span>
              <Target className="w-4 h-4 text-pink-500" />
            </div>
            {renderAwardList(awards.bestBowler)}
            {awards.bestBowler?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                FIGURES: {awards.bestBowler[0].wickets}/{awards.bestBowler[0].runs} ({awards.bestBowler[0].overs} ov)
              </span>
            )}
          </div>

          {/* Best Fielder */}
          <div className="glass-card p-4 border-white/5 hover:border-emerald-500/20 hover:bg-emerald-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-emerald-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Best Fielder</span>
              <Shield className="w-4 h-4 text-emerald-500" />
            </div>
            {renderAwardList(awards.bestFielder)}
            {awards.bestFielder?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                CATCHES: {awards.bestFielder[0].catches} | RO: {awards.bestFielder[0].runOuts}
              </span>
            )}
          </div>

          {/* Fastest Scorer */}
          <div className="glass-card p-4 border-white/5 hover:border-yellow-500/20 hover:bg-yellow-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-yellow-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Fastest Scorer</span>
              <Activity className="w-4 h-4 text-yellow-500" />
            </div>
            {renderAwardList(awards.fastestScorer, 'No bats met 15-ball quota')}
            {awards.fastestScorer?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                SR: {awards.fastestScorer[0].strikeRate}% ({awards.fastestScorer[0].runs} runs)
              </span>
            )}
          </div>

          {/* Most Sixes */}
          <div className="glass-card p-4 border-white/5 hover:border-purple-500/20 hover:bg-purple-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-purple-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Sixes King</span>
              <Flame className="w-4 h-4 text-purple-500" />
            </div>
            {renderAwardList(awards.mostSixes)}
            {awards.mostSixes?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                SIXES HIT: {awards.mostSixes[0].sixes}
              </span>
            )}
          </div>

          {/* Most Fours */}
          <div className="glass-card p-4 border-white/5 hover:border-blue-500/20 hover:bg-blue-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-blue-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Boundary King</span>
              <Target className="w-4 h-4 text-blue-500" />
            </div>
            {renderAwardList(awards.mostFours)}
            {awards.mostFours?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                FOURS HIT: {awards.mostFours[0].fours}
              </span>
            )}
          </div>

          {/* Best Partnership */}
          <div className="glass-card p-4 border-white/5 hover:border-cyan-500/20 hover:bg-cyan-500/5 transition duration-300 flex flex-col justify-between min-h-[120px] sm:col-span-2">
            <div className="flex items-center justify-between text-cyan-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Best Partnership</span>
              <Users className="w-4 h-4 text-cyan-500" />
            </div>
            {awards.bestPartnership ? (
              <div className="text-white text-xs font-bold uppercase truncate">
                {awards.bestPartnership.batsman1} & {awards.bestPartnership.batsman2}
              </div>
            ) : (
              <span className="text-gray-600 italic">N/A</span>
            )}
            {awards.bestPartnership && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                PARTNERSHIP SCORE: {awards.bestPartnership.runs} runs
              </span>
            )}
          </div>

          {/* Best All-Rounder */}
          <div className="glass-card p-4 border-white/5 hover:border-red-500/20 hover:bg-red-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-red-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Best All-Rounder</span>
              <Award className="w-4 h-4 text-red-500" />
            </div>
            {renderAwardList(awards.bestAllRounder)}
            {awards.bestAllRounder?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                {awards.bestAllRounder[0].runs} runs & {awards.bestAllRounder[0].wickets} wkts
              </span>
            )}
          </div>

          {/* Game Changer */}
          <div className="glass-card p-4 border-white/5 hover:border-teal-500/20 hover:bg-teal-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-teal-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Game Changer</span>
              <Zap className="w-4 h-4 text-teal-500" />
            </div>
            {renderAwardList(awards.gameChanger)}
            {awards.gameChanger?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                MVP RATING SCORE: {awards.gameChanger[0].score} pts
              </span>
            )}
          </div>

          {/* Economy King */}
          <div className="glass-card p-4 border-white/5 hover:border-emerald-400/20 hover:bg-[#39ff14]/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-[#39ff14] pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Economy King</span>
              <Medal className="w-4 h-4 text-[#39ff14]" />
            </div>
            {renderAwardList(awards.economyKing, 'No bowler met 2-over quota')}
            {awards.economyKing?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                ECON: {awards.economyKing[0].economy} ({awards.economyKing[0].runs} runs conceded)
              </span>
            )}
          </div>

          {/* Emerging Player */}
          <div className="glass-card p-4 border-white/5 hover:border-indigo-500/20 hover:bg-indigo-500/5 transition duration-300 flex flex-col justify-between min-h-[120px]">
            <div className="flex items-center justify-between text-indigo-400 pb-1.5 border-b border-white/5 mb-3">
              <span className="text-[9px] uppercase font-bold tracking-widest font-mono">Emerging Player</span>
              <Trophy className="w-4 h-4 text-indigo-500" />
            </div>
            {renderAwardList(awards.emergingPlayer)}
            {awards.emergingPlayer?.[0] && (
              <span className="text-[9px] font-mono text-[#66fcf1] mt-2 block font-bold">
                MVP SCORE: {awards.emergingPlayer[0].score} pts (Match count &le; 5)
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
