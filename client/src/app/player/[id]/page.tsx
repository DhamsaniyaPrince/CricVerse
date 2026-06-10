'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ShareModal from '@/components/common/ShareModal';
import api from '@/utils/api';
import { getSiteUrl } from '@/utils/urlHelper';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { 
  User, Trophy, Award, Activity, Calendar, 
  Zap, Star, RefreshCw, Share2, Download, 
  QrCode, Flame, ChevronRight, TrendingUp, ShieldAlert 
} from 'lucide-react';

interface PlayerStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    highestScore: number;
    average: number;
    strikeRate: number;
  };
  bowling: {
    matches: number;
    wickets: number;
    bestBowling: string;
    economy: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

interface Player {
  _id: string;
  name: string;
  avatar: string;
  username?: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  bio: string;
  stats: PlayerStats;
  mvpAwards: number;
  longestStreak: number;
  recentFormRating: number;
  currentTeam?: {
    _id: string;
    name: string;
    logo?: string;
  };
  matchHistory: Array<{
    matchId: string;
    runs: number;
    balls: number;
    wickets: number;
    overs: number;
    opponentName: string;
    tournamentName: string;
    resultText: string;
    mvpStatus: boolean;
    date: string;
  }>;
}

interface AwardItem {
  _id: string;
  awardType: string;
  performance: string;
  date: string;
  match: {
    _id: string;
    title: string;
    date: string;
  };
}

export default function PlayerPublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [timeline, setTimeline] = useState<AwardItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'awards' | 'history'>('overview');
  
  // Share States
  const [shareOpen, setShareOpen] = useState(false);

  const fetchPlayerData = async () => {
    setIsLoading(true);
    try {
      // Fetch profile
      const response = await api.get(`/players/${rawId}`);
      if (response.data.success) {
        setPlayer(response.data.data);
      }

      // Fetch awards timeline
      const timelineRes = await api.get(`/awards/player-timeline/${rawId}`);
      if (timelineRes.data.success) {
        setTimeline(timelineRes.data.data);
      }
    } catch (err) {
      console.error('Error loading player data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (rawId) {
      fetchPlayerData();
    }
  }, [rawId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center p-8 glass-card max-w-sm border-red-500/20">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Profile Not Found</h2>
          <button onClick={() => router.push('/')} className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] font-bold rounded-xl cursor-pointer">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Calculate Award counts
  const potmCount = timeline.filter(a => a.awardType === 'Player of the Match').length;
  const bestBatterCount = timeline.filter(a => ['Highest Run Scorer', 'Fastest Scorer', 'Most Sixes', 'Most Fours'].includes(a.awardType)).length;
  const bestBowlerCount = timeline.filter(a => ['Best Bowler', 'Economy King'].includes(a.awardType)).length;
  const bestFielderCount = timeline.filter(a => a.awardType === 'Best Fielder').length;

  const siteUrl = getSiteUrl();
  const shareUrl = `${siteUrl}/player/${player.username || player._id}`;
  const shareText = `🏆 Check out player stats and awards for ${player.name} on CricVerse! Total Runs: ${player.stats?.batting?.runs || 0} | Wickets: ${player.stats?.bowling?.wickets || 0} | MVPs: ${player.mvpAwards || 0}.`;

  // Draw Player Card Poster
  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0b0c10');
    grad.addColorStop(1, '#1f2833');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    // Frame
    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 570, 370);

    // Header title
    ctx.fillStyle = '#66fcf1';
    ctx.font = 'bold 20px Helvetica';
    ctx.fillText('CRICVERSE ATHLETE DECK', 40, 50);

    // Player Details
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Helvetica';
    ctx.fillText(player.name.toUpperCase(), 40, 100);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px Helvetica';
    ctx.fillText(`${player.role.toUpperCase()} | ${player.currentTeam?.name || 'FREE AGENT'}`, 40, 125);

    // Styling Lines
    ctx.strokeStyle = 'rgba(102, 252, 241, 0.2)';
    ctx.beginPath();
    ctx.moveTo(40, 145);
    ctx.lineTo(560, 145);
    ctx.stroke();

    // Stats Grid
    const drawCardStat = (x: number, y: number, label: string, val: string) => {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Helvetica';
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = '#66fcf1';
      ctx.font = 'bold 24px Helvetica';
      ctx.fillText(val, x, y + 30);
    };

    drawCardStat(40, 180, 'Matches', String(player.stats?.batting?.matches || 0));
    drawCardStat(160, 180, 'Runs', String(player.stats?.batting?.runs || 0));
    drawCardStat(280, 180, 'Wickets', String(player.stats?.bowling?.wickets || 0));
    drawCardStat(400, 180, 'MVP Rating', `${player.recentFormRating}%`);

    drawCardStat(40, 260, 'Bat Avg', String(player.stats?.batting?.average || '0.0'));
    drawCardStat(160, 260, 'Wkts Best', player.stats?.bowling?.bestBowling || '0/0');
    drawCardStat(280, 260, 'MVPs Won', String(player.mvpAwards || 0));
    drawCardStat(400, 260, 'Role Style', player.battingStyle.split('-')[0] + ' Bat');

    // Footer branding
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px Helvetica';
    ctx.fillText('POWERED BY CRICVERSE DIGITAL ENGINE', 40, 360);

    const link = document.createElement('a');
    link.download = `cricverse_player_${player.name.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  // Recharts Formatters
  const recentHistoryData = player.matchHistory && player.matchHistory.length > 0
    ? [...player.matchHistory].reverse().map((m, idx) => ({
        name: `G ${idx + 1}`,
        runs: m.runs || 0,
        wickets: m.wickets || 0,
      }))
    : [];

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Cover Banner Header Card */}
          <div className="glass-card mb-8 border-[#66fcf1]/10 overflow-hidden relative select-none">
            <div className="h-40 md:h-56 w-full relative bg-gradient-to-r from-[#1f2833] via-[#0b0c10] to-[#66fcf1]/10 flex items-center justify-end pr-8 pointer-events-none">
              <Trophy className="w-40 h-40 text-white/5 absolute -bottom-10 left-10 transform -rotate-12" />
            </div>

            <div className="px-6 pb-6 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 -mt-16 md:-mt-20">
              <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-32 h-32 md:w-36 md:h-36 rounded-2xl bg-gradient-to-br from-[#66fcf1] to-[#1f2833] p-1 shadow-xl relative group">
                  <div className="w-full h-full bg-[#0b0c10] rounded-2xl overflow-hidden flex items-center justify-center">
                    {player.avatar ? (
                      <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-16 h-16 text-[#66fcf1]" />
                    )}
                  </div>
                </div>

                <div className="text-center md:text-left space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">{player.name}</h1>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center justify-center md:justify-start space-x-2">
                    <span className="text-[#66fcf1]">{player.role}</span>
                    <span>•</span>
                    <span>{player.currentTeam?.name || 'Free Agent'}</span>
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex space-x-2.5">
                <button
                  onClick={() => setShareOpen(true)}
                  className="flex items-center space-x-1.5 px-4.5 py-2.5 bg-[#1f2833] hover:bg-[#1f2833]/85 border border-[#66fcf1]/20 hover:border-[#66fcf1] text-[#66fcf1] rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Profile</span>
                </button>
                <button
                  onClick={handleDownloadCard}
                  className="flex items-center space-x-1.5 px-4.5 py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] rounded-xl text-xs font-black shadow-lg shadow-[#66fcf1]/10 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Player Card</span>
                </button>
              </div>
            </div>
          </div>

          {/* Profile Overview and Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* Left Sidebar Info Card */}
            <div className="lg:col-span-1 space-y-6">
              <div className="glass-card p-5 border-white/5 space-y-5">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">Profile Details</h3>
                
                <div className="space-y-4 font-mono text-xs">
                  <div>
                    <span className="text-gray-500 block uppercase text-[10px]">Username</span>
                    <strong className="text-white block font-sans mt-0.5">@{player.username || 'n/a'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[10px]">Batting Style</span>
                    <strong className="text-white block mt-0.5">{player.battingStyle}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[10px]">Bowling Style</span>
                    <strong className="text-white block mt-0.5">{player.bowlingStyle || 'None'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block uppercase text-[10px]">Bio</span>
                    <p className="text-gray-400 font-sans mt-1 leading-relaxed">{player.bio || 'No bio provided.'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right main panel */}
            <div className="lg:col-span-3 space-y-8">
              
              {/* Tab Navigation */}
              <div className="flex border-b border-[#66fcf1]/15 select-none">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                    activeTab === 'overview' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                    activeTab === 'analytics' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => setActiveTab('awards')}
                  className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                    activeTab === 'awards' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Awards ({timeline.length})
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                    activeTab === 'history' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
                  }`}
                >
                  Fixtures
                </button>
              </div>

              {/* Tab Contents */}
              {activeTab === 'overview' && (
                <div className="space-y-8">
                  {/* Stats Cards Row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="glass-card p-4 border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Total Runs</span>
                      <strong className="text-2xl md:text-3xl font-black text-[#66fcf1] mt-2 block">{player.stats?.batting?.runs || 0}</strong>
                    </div>
                    <div className="glass-card p-4 border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Batting Avg</span>
                      <strong className="text-2xl md:text-3xl font-black text-white mt-2 block">{player.stats?.batting?.average || '0.00'}</strong>
                    </div>
                    <div className="glass-card p-4 border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Wickets Taken</span>
                      <strong className="text-2xl md:text-3xl font-black text-pink-500 mt-2 block">{player.stats?.bowling?.wickets || 0}</strong>
                    </div>
                    <div className="glass-card p-4 border-white/5 flex flex-col justify-between">
                      <span className="text-[9px] text-gray-500 uppercase tracking-widest font-mono">Recent Form</span>
                      <strong className="text-2xl md:text-3xl font-black text-yellow-400 mt-2 block">{player.recentFormRating}%</strong>
                    </div>
                  </div>

                  {/* Career stats tables */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Batting Card */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">Career Batting</h4>
                      <div className="grid grid-cols-2 gap-4 font-mono text-xs text-gray-400">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Matches:</span>
                          <strong className="text-white">{player.stats?.batting?.matches || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Innings:</span>
                          <strong className="text-white">{player.stats?.batting?.innings || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Runs:</span>
                          <strong className="text-white">{player.stats?.batting?.runs || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Highest:</span>
                          <strong className="text-white">{player.stats?.batting?.highestScore || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Average:</span>
                          <strong className="text-white">{player.stats?.batting?.average || '0.00'}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Strike Rate:</span>
                          <strong className="text-white">{player.stats?.batting?.strikeRate || '0.0'}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Bowling Card */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-pink-500 border-b border-white/5 pb-2">Career Bowling</h4>
                      <div className="grid grid-cols-2 gap-4 font-mono text-xs text-gray-400">
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Matches:</span>
                          <strong className="text-white">{player.stats?.bowling?.matches || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Wickets:</span>
                          <strong className="text-white">{player.stats?.bowling?.wickets || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Best Spell:</span>
                          <strong className="text-white">{player.stats?.bowling?.bestBowling || '0/0'}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Economy:</span>
                          <strong className="text-white">{player.stats?.bowling?.economy || '0.00'}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Catches:</span>
                          <strong className="text-white">{player.stats?.fielding?.catches || 0}</strong>
                        </div>
                        <div className="flex justify-between border-b border-white/5 pb-1">
                          <span>Run Outs:</span>
                          <strong className="text-white">{player.stats?.fielding?.runOuts || 0}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Highlights section */}
                  <div className="glass-card p-5 border-white/5 space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-white border-b border-white/5 pb-2">Awards Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                      <div className="p-3 bg-[#0b0c10]/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Player of Match</span>
                        <strong className="text-xl font-bold text-yellow-400 mt-1 block">{potmCount}</strong>
                      </div>
                      <div className="p-3 bg-[#0b0c10]/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">MVP Scorecard</span>
                        <strong className="text-xl font-bold text-[#66fcf1] mt-1 block">{player.mvpAwards}</strong>
                      </div>
                      <div className="p-3 bg-[#0b0c10]/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Best Batter Accolades</span>
                        <strong className="text-xl font-bold text-orange-400 mt-1 block">{bestBatterCount}</strong>
                      </div>
                      <div className="p-3 bg-[#0b0c10]/40 rounded-xl border border-white/5">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block">Best Bowler Accolades</span>
                        <strong className="text-xl font-bold text-pink-500 mt-1 block">{bestBowlerCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'analytics' && (
                <div className="space-y-8">
                  {recentHistoryData.length === 0 ? (
                    <div className="glass-card p-12 text-center border-white/5 text-gray-500 italic">
                      Insufficient match data to render performance analytics.
                    </div>
                  ) : (
                    <>
                      {/* Runs graph */}
                      <div className="glass-card p-5 border-white/5 space-y-4">
                        <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Runs Scoring Match-by-Match</span>
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={recentHistoryData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" />
                              <YAxis stroke="rgba(255,255,255,0.4)" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(102,252,241,0.2)' }}
                                labelStyle={{ color: '#66fcf1' }}
                              />
                              <Line type="monotone" dataKey="runs" stroke="#66fcf1" strokeWidth={2.5} dot={{ r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Wickets graph */}
                      <div className="glass-card p-5 border-white/5 space-y-4">
                        <h4 className="text-xs uppercase font-extrabold tracking-widest text-pink-500 flex items-center space-x-1">
                          <TrendingUp className="w-4 h-4" />
                          <span>Wickets Taking Match-by-Match</span>
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={recentHistoryData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" />
                              <YAxis stroke="rgba(255,255,255,0.4)" />
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(255,0,127,0.2)' }}
                                labelStyle={{ color: '#ff007f' }}
                              />
                              <Bar dataKey="wickets" fill="#ff007f" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === 'awards' && (
                <div className="space-y-6">
                  {timeline.length === 0 ? (
                    <div className="glass-card p-12 text-center border-white/5 text-gray-500 italic">
                      No awards registered for this player.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timeline.map((item, idx) => (
                        <div key={item._id || idx} className="glass-card p-4 border-[#66fcf1]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#66fcf1]/10 border border-[#66fcf1]/20 flex items-center justify-center text-[#66fcf1] flex-shrink-0">
                              {item.awardType === 'Player of the Match' ? <Trophy className="w-5 h-5" /> : <Award className="w-5 h-5" />}
                            </div>
                            <div>
                              <strong className="text-white text-sm uppercase tracking-wide block">{item.awardType}</strong>
                              <span className="text-xs text-gray-400 block">{item.performance}</span>
                            </div>
                          </div>
                          
                          <div className="text-right sm:text-right font-mono text-[10px] text-gray-500 flex flex-col items-start sm:items-end">
                            <span className="text-gray-300 font-bold uppercase">{item.match?.title || 'Match'}</span>
                            <span className="mt-0.5">{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'history' && (
                <div className="space-y-6">
                  {player.matchHistory.length === 0 ? (
                    <div className="glass-card p-12 text-center border-white/5 text-gray-500 italic">
                      No completed match history available.
                    </div>
                  ) : (
                    <div className="glass-card border-white/5 overflow-hidden">
                      <table className="w-full text-left text-xs text-gray-400 border-collapse">
                        <thead className="bg-[#1f2833]/20 text-[10px] uppercase text-gray-500 font-bold border-b border-white/5 font-mono">
                          <tr>
                            <th className="p-4">Opponent</th>
                            <th className="p-4">Tournament</th>
                            <th className="p-4 text-center">Runs (Balls)</th>
                            <th className="p-4 text-center">Wkts (Overs)</th>
                            <th className="p-4 text-center">MVP</th>
                            <th className="p-4 text-right">Result</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {player.matchHistory.map((m, idx) => (
                            <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                              <td className="p-4 text-white font-bold font-sans uppercase">{m.opponentName}</td>
                              <td className="p-4">{m.tournamentName}</td>
                              <td className="p-4 text-center text-white font-bold">{m.runs} <span className="text-[10px] text-gray-500 font-normal">({m.balls}b)</span></td>
                              <td className="p-4 text-center text-white font-bold">{m.wickets} <span className="text-[10px] text-gray-500 font-normal">({m.overs}ov)</span></td>
                              <td className="p-4 text-center">
                                {m.mvpStatus ? (
                                  <Trophy className="w-4 h-4 text-yellow-500 mx-auto" />
                                ) : (
                                  <span className="text-gray-600">-</span>
                                )}
                              </td>
                              <td className="p-4 text-right text-gray-300 font-sans uppercase font-bold max-w-[150px] truncate">{m.resultText}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </main>
      </div>

      {/* Sharing modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        shareUrl={shareUrl}
        shareText={shareText}
        title={`Share ${player.name}'s Profile`}
      />
    </div>
  );
}
