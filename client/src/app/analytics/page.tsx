'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { useRouter } from 'next/navigation';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Activity,
  User,
  Filter,
  PieChart as PieIcon,
  RefreshCw,
  Trophy,
  Award,
  Zap,
  Target,
  Flame
} from 'lucide-react';

interface PlayerListItem {
  _id: string;
  name: string;
  role: string;
}

interface PerformanceLogItem {
  matchId: string;
  matchTitle: string;
  date: string;
  runs: number;
  balls: number;
  strikeRate: number;
  wickets: number;
  runsConceded: number;
  overs: number;
  economy: number;
}

interface PlayerStats {
  batting: {
    matches: number;
    runs: number;
    ballsFaced: number;
    innings: number;
    highestScore: number;
    average: number;
    strikeRate: number;
    fifties: number;
    hundreds: number;
  };
  bowling: {
    matches: number;
    wickets: number;
    ballsBowled: number;
    runsConceded: number;
    runsPerBall: number;
    average: number;
    strikeRate: number;
    fiveWickets: number;
  };
}

interface PlayerAnalytics {
  player: {
    _id?: string;
    name: string;
    role: string;
    avatar?: string;
    mvpPoints?: number;
    username?: string;
    team?: {
      name: string;
      logo: string;
    } | null;
    stats: PlayerStats;
  };
  performanceLog: PerformanceLogItem[];
  shotDistribution: { offSide: number; legSide: number; totalShots: number };
  highestRuns?: number;
  lowestRuns?: number;
  highestWickets?: number;
  lowestWickets?: number;
  consistencyRating?: number;
  longestStreak?: number;
  recentFormRating?: number;
  isDetailedStatsAuthorized?: boolean;
}

interface SystemAnalytics {
  totalMatches: number;
  completedMatches: number;
  liveMatches: number;
  totalPlayers: number;
  totalTeams: number;
  overallStats: { totalRuns: number; totalWickets: number; avgRunsPerMatch: number };
  matchTrend: { name: string; runs: number }[];
}

export default function AnalyticsDashboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playersList, setPlayersList] = useState<PlayerListItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  
  // States for player and system analytics
  const [playerData, setPlayerData] = useState<PlayerAnalytics | null>(null);
  const [systemData, setSystemData] = useState<SystemAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // View selection
  const [activeView, setActiveView] = useState<'player' | 'system' | 'top-performers' | 'player-compare'>('system');

  // New States for comparison and top performers
  const [topPerformers, setTopPerformers] = useState<any | null>(null);
  const [comparePlayerAId, setComparePlayerAId] = useState<string>('');
  const [comparePlayerBId, setComparePlayerBId] = useState<string>('');
  const [comparePlayerAData, setComparePlayerAData] = useState<PlayerAnalytics | null>(null);
  const [comparePlayerBData, setComparePlayerBData] = useState<PlayerAnalytics | null>(null);
  const [isPlayerCompareLoading, setIsPlayerCompareLoading] = useState(false);

  const fetchInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch system dashboard stats
      const sysResponse = await api.get('/analytics/dashboard');
      if (sysResponse.data.success) {
        setSystemData(sysResponse.data.data);
      }

      // 2. Fetch players list for selector dropdown
      const playerListResponse = await api.get('/players');
      if (playerListResponse.data.success) {
        setPlayersList(playerListResponse.data.data);
        if (playerListResponse.data.data.length > 0) {
          setSelectedPlayerId(playerListResponse.data.data[0]._id);
        }
      }

      // 3. Fetch top performers awards board
      const topResponse = await api.get('/awards/top-performers');
      if (topResponse.data.success) {
        setTopPerformers(topResponse.data.data);
      }
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchPlayerAnalytics = async (id: string) => {
    if (!id) return;
    setIsLoading(true);
    try {
      const response = await api.get(`/analytics/player/${id}`);
      if (response.data.success) {
        setPlayerData(response.data.data);
        setActiveView('player');
      }
    } catch (err) {
      console.error('Error fetching player analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPlayerCompareData = async (idA: string, idB: string) => {
    if (!idA || !idB) return;
    setIsPlayerCompareLoading(true);
    try {
      const [resA, resB] = await Promise.all([
        api.get(`/analytics/player/${idA}`),
        api.get(`/analytics/player/${idB}`)
      ]);
      if (resA.data.success) {
        setComparePlayerAData(resA.data.data);
      }
      if (resB.data.success) {
        setComparePlayerBData(resB.data.data);
      }
    } catch (err) {
      console.error('Error comparing players:', err);
    } finally {
      setIsPlayerCompareLoading(false);
    }
  };

  useEffect(() => {
    if (comparePlayerAId && comparePlayerBId) {
      fetchPlayerCompareData(comparePlayerAId, comparePlayerBId);
    }
  }, [comparePlayerAId, comparePlayerBId]);

  const handlePlayerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPlayerId(id);
    if (id) {
      fetchPlayerAnalytics(id);
    }
  };

  const handleShowSystem = () => {
    setActiveView('system');
  };

  // Pie chart data prep
  const pieColors = ['#66fcf1', '#ff007f'];
  const getShotPieData = () => {
    if (!playerData) return [];
    return [
      { name: 'Off-Side', value: playerData.shotDistribution.offSide },
      { name: 'Leg-Side', value: playerData.shotDistribution.legSide }
    ].filter(d => d.value > 0);
  };

  // Consistency graph data prep
  const getConsistencyData = () => {
    if (!playerData) return [];
    const averageVal = playerData.player.stats?.batting?.average || 40;
    return playerData.performanceLog.map(log => ({
      match: log.matchTitle.split(':')[0],
      runs: log.runs,
      average: averageVal
    }));
  };

  // Helper helpers for comparisons
  const getOffsidePct = (data: PlayerAnalytics | null) => {
    if (!data || !data.shotDistribution || data.shotDistribution.totalShots === 0) return 0;
    return Math.round((data.shotDistribution.offSide / data.shotDistribution.totalShots) * 100);
  };

  const renderCompareRow = (
    label: string,
    valA: number | undefined,
    valB: number | undefined,
    format: 'number' | 'percent' | 'decimal' | 'string' = 'number',
    higherIsBetter = true
  ) => {
    const a = valA || 0;
    const b = valB || 0;

    let displayA: string | number = a;
    let displayB: string | number = b;

    if (format === 'percent') {
      displayA = `${a}%`;
      displayB = `${b}%`;
    } else if (format === 'decimal') {
      displayA = a.toFixed(2);
      displayB = b.toFixed(2);
    }

    let classA = 'text-gray-300';
    let classB = 'text-gray-300';

    if (a !== b) {
      const isWinnerA = higherIsBetter ? a > b : a < b;
      if (isWinnerA) {
        classA = 'text-[#39ff14] font-black drop-shadow-[0_0_8px_rgba(57,255,20,0.25)]';
        classB = 'text-gray-500';
      } else {
        classB = 'text-[#39ff14] font-black drop-shadow-[0_0_8px_rgba(57,255,20,0.25)]';
        classA = 'text-gray-500';
      }
    }

    return (
      <div className="grid grid-cols-3 py-3 border-b border-white/5 last:border-0 items-center text-center text-xs">
        <div className={`font-mono text-sm ${classA}`}>{displayA}</div>
        <div className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">{label}</div>
        <div className={`font-mono text-sm ${classB}`}>{displayB}</div>
      </div>
    );
  };

  const renderCompareHeader = (pData: PlayerAnalytics | null) => {
    if (!pData) {
      return (
        <div className="glass-card p-6 border-white/5 bg-[#1f2833]/5 flex flex-col items-center justify-center min-h-[120px] text-center">
          <User className="w-10 h-10 text-gray-700 mb-2" />
          <span className="text-xs text-gray-500 font-bold uppercase">No Player Selected</span>
        </div>
      );
    }

    const p = pData.player;
    return (
      <div className="glass-card p-5 border-[#66fcf1]/15 bg-gradient-to-br from-[#1f2833]/15 to-transparent hover:border-[#66fcf1]/30 transition duration-300 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-[#66fcf1]/5 rounded-full blur-2xl group-hover:bg-[#66fcf1]/10 transition"></div>
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-gray-900 border-2 border-[#66fcf1]/30 overflow-hidden flex items-center justify-center font-black text-white text-xl shadow-lg">
            {p.avatar ? (
              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
            ) : (
              p.name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="text-center sm:text-left flex-1 min-w-0">
            <h3 
              onClick={() => router.push(`/player/${p.username || p._id}`)}
              className="font-black text-white text-base uppercase leading-tight hover:text-[#66fcf1] transition truncate cursor-pointer"
            >
              {p.name}
            </h3>
            <p className="text-[10px] text-[#66fcf1] uppercase mt-0.5 font-bold tracking-wider">
              {p.role}
            </p>
            <p className="text-[10px] text-gray-400 uppercase mt-1.5 font-bold flex items-center justify-center sm:justify-start space-x-1">
              {p.team?.logo && (
                <img src={p.team.logo} className="w-3.5 h-3.5 rounded-sm object-cover mr-1" />
              )}
              <span>{p.team?.name || 'Free Agent'}</span>
            </p>
          </div>
          {p.mvpPoints !== undefined && (
            <div className="text-center bg-yellow-500/10 border border-yellow-500/20 px-3 py-1.5 rounded-xl">
              <span className="text-[8px] text-yellow-500 block uppercase font-black tracking-wider">MVP Score</span>
              <span className="text-sm font-black text-yellow-400 font-mono">{p.mvpPoints} Pts</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const getAwardIcon = (awardType: string) => {
    switch (awardType) {
      case 'Highest Run Scorer':
        return <TrendingUp className="w-4 h-4 text-emerald-400" />;
      case 'Best Bowler':
        return <Target className="w-4 h-4 text-pink-400" />;
      case 'Best Fielder':
        return <Activity className="w-4 h-4 text-orange-400" />;
      case 'Fastest Scorer':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'Most Sixes':
        return <Flame className="w-4 h-4 text-red-500" />;
      case 'Most Fours':
        return <Award className="w-4 h-4 text-blue-400" />;
      case 'Economy King':
        return <Trophy className="w-4 h-4 text-purple-400" />;
      default:
        return <Award className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header Title & Selector */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <BarChart3 className="w-8 h-8 text-[#66fcf1]" />
                <span>CricVerse Analytics</span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">Interactive graphs, strike profiles, and consistency indexes.</p>
            </div>

            {/* Selector Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleShowSystem}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition ${
                  activeView === 'system'
                    ? 'bg-[#66fcf1] text-[#0b0c10]'
                    : 'bg-[#1f2833]/40 border border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                Global League Stats
              </button>

              <button
                onClick={() => setActiveView('top-performers')}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeView === 'top-performers'
                    ? 'bg-[#66fcf1] text-[#0b0c10]'
                    : 'bg-[#1f2833]/40 border border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Top Performers</span>
              </button>

              <button
                onClick={() => {
                  setActiveView('player-compare');
                  if (!comparePlayerAId && playersList.length > 0) {
                    setComparePlayerAId(playersList[0]._id);
                  }
                  if (!comparePlayerBId && playersList.length > 1) {
                    setComparePlayerBId(playersList[1]._id);
                  }
                }}
                className={`py-2 px-4 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                  activeView === 'player-compare'
                    ? 'bg-[#66fcf1] text-[#0b0c10]'
                    : 'bg-[#1f2833]/40 border border-white/10 text-gray-300 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Compare Players</span>
              </button>

              <div className="flex items-center space-x-2 bg-[#1f2833]/20 border border-white/5 py-1 px-3 rounded-xl">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedPlayerId}
                  onChange={handlePlayerChange}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0b0c10]">Select Player...</option>
                  {playersList.map(p => (
                    <option key={p._id} value={p._id} className="bg-[#0b0c10]">{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-32">
              <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
            </div>
          ) : activeView === 'system' && systemData ? (
            /* SYSTEM LEAGUE WIDE ANALYTICS VIEW */
            <div className="space-y-8">
              {/* Overall Analytics widgets */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-[#66fcf1]/5">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Total Runs Scored</span>
                  <span className="text-2xl font-bold font-mono text-emerald-400 mt-1 block">
                    {systemData.overallStats.totalRuns}
                  </span>
                </div>
                <div className="glass-card p-5 border-[#66fcf1]/5">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Total Wickets Fallen</span>
                  <span className="text-2xl font-bold font-mono text-pink-400 mt-1 block">
                    {systemData.overallStats.totalWickets}
                  </span>
                </div>
                <div className="glass-card p-5 border-[#66fcf1]/5">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Leagues Size</span>
                  <span className="text-2xl font-bold font-mono text-white mt-1 block">
                    {systemData.totalTeams} Teams
                  </span>
                </div>
                <div className="glass-card p-5 border-[#66fcf1]/5">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Avg Score / Match</span>
                  <span className="text-2xl font-bold font-mono text-[#66fcf1] mt-1 block">
                    {systemData.overallStats.avgRunsPerMatch} runs
                  </span>
                </div>
              </div>

              {/* Match Comparison metrics */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <div className="flex items-center space-x-2.5 mb-6">
                  <TrendingUp className="w-5 h-5 text-[#66fcf1]" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Global Match Scores Trend</h3>
                </div>
                {systemData.matchTrend && systemData.matchTrend.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={systemData.matchTrend}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="runs" fill="#66fcf1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-[#66fcf1]/20 rounded-xl bg-[#0b0c10]/40">
                    <BarChart3 className="w-10 h-10 text-gray-600 mb-2" />
                    <p className="text-gray-400 font-bold text-xs">No Statistics Available</p>
                    <p className="text-gray-600 text-[10px] mt-1">Play matches to populate the scoring trend profile.</p>
                  </div>
                )}
              </div>
            </div>
          ) : activeView === 'top-performers' ? (
            /* TOP PERFORMERS VIEW */
            <div className="space-y-8 animate-fadeIn">
              <div className="flex items-center space-x-2 border-b border-white/5 pb-4">
                <Trophy className="w-6 h-6 text-[#66fcf1]" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Top Performers Leaderboard</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topPerformers ? (
                  Object.keys(topPerformers).map((category) => {
                    const list = topPerformers[category];
                    return (
                      <div key={category} className="glass-card p-5 border-[#66fcf1]/10 flex flex-col h-full bg-[#1f2833]/5 hover:border-[#66fcf1]/25 transition duration-300">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                            {getAwardIcon(category)}
                            <span>{category}</span>
                          </span>
                          <span className="text-[9px] text-gray-500 font-bold uppercase font-mono">Top 5</span>
                        </div>
                        
                        <div className="flex-1 space-y-3">
                          {list.map((item: any, index: number) => (
                            <div key={item._id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                              <div className="flex items-center space-x-2.5">
                                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-black ${
                                  index === 0 
                                    ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-md shadow-yellow-500/25' 
                                    : index === 1 
                                    ? 'bg-slate-300 text-black' 
                                    : index === 2 
                                    ? 'bg-amber-600 text-white' 
                                    : 'bg-white/5 text-gray-400'
                                }`}>
                                  {index + 1}
                                </span>
                                <div className="w-8 h-8 rounded-lg bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center text-xs font-bold text-white">
                                  {item.avatar ? (
                                    <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    item.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="text-xs">
                                  <span 
                                    className="font-bold text-white block hover:text-[#66fcf1] transition cursor-pointer" 
                                    onClick={() => router.push(`/player/${item.username || item._id}`)}
                                  >
                                    {item.name}
                                  </span>
                                  <span className="text-[9px] text-gray-500 uppercase flex items-center">
                                    {item.team?.logo && (
                                      <img src={item.team.logo} alt={item.team.name} className="w-3 h-3 object-cover rounded-sm mr-1" />
                                    )}
                                    <span className="truncate max-w-[80px]">{item.team?.name || 'Free Agent'}</span>
                                  </span>
                                </div>
                              </div>
                              
                              <div className="text-right">
                                <span className="text-xs font-black text-[#39ff14] font-mono">
                                  {item.count} {item.count === 1 ? 'Win' : 'Wins'}
                                </span>
                                {item.maxValue !== undefined && item.maxValue !== null && (
                                  <span className="text-[9px] text-gray-500 font-bold block font-mono">
                                    Best: {item.maxValue}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          
                          {list.length === 0 && (
                            <p className="text-gray-500 text-xs text-center py-6 italic">No awards in this category yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm italic col-span-full text-center py-12">No top performers data loaded</p>
                )}
              </div>
            </div>
          ) : activeView === 'player-compare' ? (
            /* PLAYER COMPARISON VIEW */
            <div className="space-y-8 animate-fadeIn">
              {/* Header */}
              <div className="flex items-center space-x-2.5 border-b border-white/5 pb-4">
                <Zap className="w-6 h-6 text-[#66fcf1]" />
                <h2 className="text-xl font-bold text-white uppercase tracking-wider">Player Head-to-Head Comparison</h2>
              </div>

              {/* Comparison Selectors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#1f2833]/10 border border-white/5 p-6 rounded-2xl">
                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Select Player A</label>
                  <select
                    value={comparePlayerAId}
                    onChange={(e) => setComparePlayerAId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#66fcf1] cursor-pointer"
                  >
                    <option value="" className="bg-[#0b0c10]">Choose Player A...</option>
                    {playersList.map(p => (
                      <option key={p._id} value={p._id} disabled={p._id === comparePlayerBId} className="bg-[#0b0c10]">
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Select Player B</label>
                  <select
                    value={comparePlayerBId}
                    onChange={(e) => setComparePlayerBId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-[#66fcf1] cursor-pointer"
                  >
                    <option value="" className="bg-[#0b0c10]">Choose Player B...</option>
                    {playersList.map(p => (
                      <option key={p._id} value={p._id} disabled={p._id === comparePlayerAId} className="bg-[#0b0c10]">
                        {p.name} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {isPlayerCompareLoading ? (
                <div className="flex items-center justify-center py-24">
                  <RefreshCw className="w-10 h-10 text-[#66fcf1] animate-spin" />
                </div>
              ) : comparePlayerAData && comparePlayerBData ? (
                <div className="space-y-6 animate-fadeIn">
                  {/* Side-by-Side Player Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {renderCompareHeader(comparePlayerAData)}
                    {renderCompareHeader(comparePlayerBData)}
                  </div>

                  {/* Comparisons Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Batting Comparison */}
                    <div className="glass-card p-6 border-[#66fcf1]/10 bg-[#1f2833]/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-4 border-b border-white/5 pb-2 font-mono">
                        Career Batting Statistics
                      </h3>
                      <div className="space-y-1">
                        {renderCompareRow('Matches', comparePlayerAData.player.stats?.batting?.matches, comparePlayerBData.player.stats?.batting?.matches)}
                        {renderCompareRow('Innings', comparePlayerAData.player.stats?.batting?.innings, comparePlayerBData.player.stats?.batting?.innings)}
                        {renderCompareRow('Runs Scored', comparePlayerAData.player.stats?.batting?.runs, comparePlayerBData.player.stats?.batting?.runs)}
                        {renderCompareRow('Batting Average', comparePlayerAData.player.stats?.batting?.average, comparePlayerBData.player.stats?.batting?.average, 'decimal')}
                        {renderCompareRow('Strike Rate', comparePlayerAData.player.stats?.batting?.strikeRate, comparePlayerBData.player.stats?.batting?.strikeRate, 'decimal')}
                        {renderCompareRow('Highest Score', comparePlayerAData.player.stats?.batting?.highestScore, comparePlayerBData.player.stats?.batting?.highestScore)}
                        {renderCompareRow('Fifties', comparePlayerAData.player.stats?.batting?.fifties, comparePlayerBData.player.stats?.batting?.fifties)}
                        {renderCompareRow('Hundreds', comparePlayerAData.player.stats?.batting?.hundreds, comparePlayerBData.player.stats?.batting?.hundreds)}
                      </div>
                    </div>

                    {/* Bowling Comparison */}
                    <div className="glass-card p-6 border-pink-500/10 bg-[#1f2833]/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-pink-500 mb-4 border-b border-white/5 pb-2 font-mono">
                        Career Bowling Statistics
                      </h3>
                      <div className="space-y-1">
                        {renderCompareRow('Matches', comparePlayerAData.player.stats?.bowling?.matches, comparePlayerBData.player.stats?.bowling?.matches)}
                        {renderCompareRow('Wickets', comparePlayerAData.player.stats?.bowling?.wickets, comparePlayerBData.player.stats?.bowling?.wickets)}
                        {renderCompareRow('Bowling Average', comparePlayerAData.player.stats?.bowling?.average, comparePlayerBData.player.stats?.bowling?.average, 'decimal', false)}
                        {renderCompareRow('Strike Rate', comparePlayerAData.player.stats?.bowling?.strikeRate, comparePlayerBData.player.stats?.bowling?.strikeRate, 'decimal', false)}
                        {renderCompareRow('Bowling Economy', 
                          comparePlayerAData.player.stats?.bowling?.runsPerBall ? comparePlayerAData.player.stats.bowling.runsPerBall * 6 : 0, 
                          comparePlayerBData.player.stats?.bowling?.runsPerBall ? comparePlayerBData.player.stats.bowling.runsPerBall * 6 : 0, 
                          'decimal', 
                          false
                        )}
                        {renderCompareRow('5-Wicket Hauls', comparePlayerAData.player.stats?.bowling?.fiveWickets, comparePlayerBData.player.stats?.bowling?.fiveWickets)}
                      </div>
                    </div>

                    {/* Consistency and Form */}
                    <div className="glass-card p-6 border-[#39ff14]/10 bg-[#1f2833]/5 col-span-full">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#39ff14] mb-4 border-b border-white/5 pb-2 font-mono">
                        Consistency & Performance Form (Detailed Logs)
                      </h3>
                      <div className="space-y-1">
                        {renderCompareRow('Consistency Rating', comparePlayerAData.consistencyRating, comparePlayerBData.consistencyRating, 'percent')}
                        {renderCompareRow('Recent Form Rating', comparePlayerAData.recentFormRating, comparePlayerBData.recentFormRating, 'percent')}
                        {renderCompareRow('Longest MVP Streak', comparePlayerAData.longestStreak, comparePlayerBData.longestStreak)}
                        {renderCompareRow('Offside Hitting Bias', getOffsidePct(comparePlayerAData), getOffsidePct(comparePlayerBData), 'percent')}
                      </div>
                      
                      {(!comparePlayerAData.isDetailedStatsAuthorized || !comparePlayerBData.isDetailedStatsAuthorized) && (
                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-center">
                          <p className="text-[10px] text-yellow-400 font-bold uppercase">
                            ⚠️ Detailed logs are only fully visible for captain/admin authorized comparisons. Sanitized details are used above.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-card p-12 text-center border-white/5 bg-[#1f2833]/5 flex flex-col items-center justify-center space-y-3">
                  <User className="w-12 h-12 text-gray-700" />
                  <div>
                    <h4 className="font-bold text-white uppercase text-xs tracking-wider">Select Players to Compare</h4>
                    <p className="text-gray-500 text-[10px] leading-relaxed mt-1 max-w-xs mx-auto">
                      Choose two players from the selectors above to run a side-by-side career and performance consistency comparison.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : playerData ? (
            /* PLAYER-SPECIFIC ANALYTICS VIEW */
            <div className="space-y-8 animate-fadeIn">
              {/* Top stats info cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 border-white/5 text-center">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Batting Average</span>
                  <span className="text-lg font-bold font-mono text-emerald-400 mt-1 block">
                    {playerData.player.stats?.batting?.average || '0.0'}
                  </span>
                </div>
                <div className="glass-card p-4 border-white/5 text-center">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Career SR</span>
                  <span className="text-lg font-bold font-mono text-[#66fcf1] mt-1 block">
                    {playerData.player.stats?.batting?.strikeRate || '0.0'}
                  </span>
                </div>
                <div className="glass-card p-4 border-white/5 text-center">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Bowling Economy</span>
                  <span className="text-lg font-bold font-mono text-pink-400 mt-1 block">
                    {playerData.player.stats?.bowling?.runsPerBall 
                      ? (playerData.player.stats.bowling.runsPerBall * 6).toFixed(2)
                      : '0.00'}
                  </span>
                </div>
                <div className="glass-card p-4 border-white/5 text-center">
                  <span className="text-[9px] text-gray-500 font-bold block uppercase">Shots Played</span>
                  <span className="text-lg font-bold font-mono text-white mt-1 block">
                    {playerData.shotDistribution.totalShots}
                  </span>
                </div>
              </div>

              {/* Charts grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Strike Rate & Runs scored line chart */}
                <div className="glass-card p-6 border-[#66fcf1]/10 bg-[#1f2833]/5">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Batting Analysis: Runs vs Strike Rate</h3>
                  {playerData.performanceLog.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={playerData.performanceLog} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                          <XAxis dataKey="matchTitle" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(v) => v.split(':')[0]} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="runs" name="Runs" stroke="#39ff14" strokeWidth={2.5} dot={{ fill: '#39ff14' }} />
                          <Line type="monotone" dataKey="strikeRate" name="Strike Rate" stroke="#66fcf1" strokeWidth={2} dot={{ fill: '#66fcf1' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs py-24 text-center italic">No runs statistics recorded for this player yet</p>
                  )}
                </div>

                {/* 2. Bowling Economy & wickets bar chart */}
                <div className="glass-card p-6 border-[#66fcf1]/10 bg-[#1f2833]/5">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-pink-500 mb-6">Bowling Analysis: Economy vs Wickets</h3>
                  {playerData.performanceLog.some(l => l.overs > 0) ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={playerData.performanceLog} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                          <XAxis dataKey="matchTitle" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(v) => v.split(':')[0]} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="wickets" name="Wickets" fill="#ff007f" radius={[4, 4, 0, 0]} maxBarSize={20} />
                          <Bar dataKey="economy" name="Economy" fill="#4b5563" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs py-24 text-center italic">No bowling logs recorded for this player yet</p>
                  )}
                </div>

                {/* 3. Consistency chart (runs vs average) */}
                <div className="glass-card p-6 border-[#66fcf1]/10 bg-[#1f2833]/5">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#39ff14] mb-6">Player Consistency Index</h3>
                  {playerData.performanceLog.length > 0 ? (
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={getConsistencyData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                          <XAxis dataKey="match" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                          <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Area type="monotone" dataKey="runs" name="Runs" stroke="#39ff14" fill="#39ff14" fillOpacity={0.1} />
                          <Area type="monotone" dataKey="average" name="Career Avg" stroke="#ff007f" fill="none" strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-xs py-24 text-center italic">No match histories available</p>
                  )}
                </div>

                {/* 4. Shot direction distribution pie chart */}
                <div className="glass-card p-6 border-[#66fcf1]/10 bg-[#1f2833]/5 flex flex-col items-center">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Wagon Wheel Shot Distribution</h3>
                  {playerData.shotDistribution.totalShots > 0 ? (
                    <div className="h-64 w-full max-w-sm">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={getShotPieData()}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={85}
                            paddingAngle={5}
                            dataKey="value"
                            label={(d) => `${d.name}: ${d.value}`}
                          >
                            {getShotPieData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-20 space-y-3">
                      <Target className="w-12 h-12 text-gray-700 mx-auto" />
                      <p className="text-gray-500 text-xs italic">No shot vectors recorded for this player yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">Analytics datasets could not be resolved.</p>
          )}
        </main>
      </div>
    </div>
  );
}
