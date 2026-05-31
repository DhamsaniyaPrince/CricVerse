'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
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
  Target
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
  player: { name: string; role: string; stats: PlayerStats };
  performanceLog: PerformanceLogItem[];
  shotDistribution: { offSide: number; legSide: number; totalShots: number };
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [playersList, setPlayersList] = useState<PlayerListItem[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('');
  
  // States for player and system analytics
  const [playerData, setPlayerData] = useState<PlayerAnalytics | null>(null);
  const [systemData, setSystemData] = useState<SystemAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeView, setActiveView] = useState<'player' | 'system'>('system');

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

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
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
          ) : playerData ? (
            /* PLAYER-SPECIFIC ANALYTICS VIEW */
            <div className="space-y-8">
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
                <div className="glass-card p-6 border-[#66fcf1]/10">
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
                <div className="glass-card p-6 border-[#66fcf1]/10">
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
                <div className="glass-card p-6 border-[#66fcf1]/10">
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
                <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col items-center">
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
