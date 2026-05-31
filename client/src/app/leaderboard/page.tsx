'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Award,
  Zap,
  Target,
  Trophy,
  Activity,
  Flame,
  Search,
  Filter,
  RefreshCw,
  User,
  Users
} from 'lucide-react';

interface TournamentItem {
  _id: string;
  name: string;
}

interface LeaderboardData {
  batsmen: any[];
  bowlers: any[];
  strikeRates: any[];
  sixes: any[];
  mvp: any[];
}

export default function LeaderboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'batsmen' | 'bowlers' | 'strikerate' | 'sixes' | 'mvp'>('batsmen');
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<LeaderboardData>({
    batsmen: [],
    bowlers: [],
    strikeRates: [],
    sixes: [],
    mvp: []
  });
  
  // Real-time socket binding
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);

  const fetchTournaments = async () => {
    try {
      const response = await api.get('/tournaments');
      if (response.data.success) {
        setTournaments(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    }
  };

  const fetchLeaderboard = async (tId: string = '') => {
    setIsLoading(true);
    try {
      const url = tId ? `/leaderboard?tournamentId=${tId}` : '/leaderboard';
      const response = await api.get(url);
      if (response.data.success) {
        const payload = response.data.data;
        setData({
          batsmen: payload.batsmen || [],
          bowlers: payload.bowlers || [],
          strikeRates: payload.strikeRates || [],
          sixes: payload.sixes || [],
          mvp: payload.mvp || []
        });
      }
    } catch (err) {
      console.error('Error fetching leaderboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Find if there is a live match to join its socket room for real-time updates
  const fetchLiveMatches = async () => {
    try {
      const response = await api.get('/matches');
      if (response.data.success) {
        const liveMatch = response.data.data.find((m: any) => m.status === 'Live');
        if (liveMatch) {
          setLiveMatchId(liveMatch._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTournaments();
    fetchLiveMatches();
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    fetchLeaderboard(selectedTournament);
  }, [selectedTournament]);

  // Connect to live scoring room if a live match exists to receive updates
  useEffect(() => {
    if (!liveMatchId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      transports: ['websocket'],
      upgrade: false
    });

    socket.on('connect', () => {
      console.log(`Leaderboard connected to socket and joined match:${liveMatchId}`);
      socket.emit('join_match_room', liveMatchId);
    });

    // Refresh when a ball is bowled in the live match
    socket.on('match:update', () => {
      console.log('Live match update detected. Refreshing leaderboards...');
      fetchLeaderboard(selectedTournament);
    });

    return () => {
      socket.emit('leave_match_room', liveMatchId);
      socket.disconnect();
    };
  }, [liveMatchId, selectedTournament]);

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTournament(e.target.value);
  };

  // Render Medal badge for top ranks
  const renderRankBadge = (index: number) => {
    const rank = index + 1;
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-black text-xs shadow-lg shadow-yellow-500/20 border border-yellow-300">
          1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-gray-300 to-gray-500 text-black font-black text-xs shadow-lg shadow-gray-400/20 border border-gray-100">
          2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-amber-600 to-amber-800 text-white font-black text-xs shadow-lg shadow-amber-700/20 border border-amber-500">
          3rd
        </span>
      );
    }
    return <span className="text-gray-500 font-mono text-sm font-bold pl-2">#{rank}</span>;
  };

  const getActiveList = () => {
    switch (activeTab) {
      case 'batsmen':
        return data.batsmen;
      case 'bowlers':
        return data.bowlers;
      case 'strikerate':
        return data.strikeRates;
      case 'sixes':
        return data.sixes;
      case 'mvp':
        return data.mvp;
      default:
        return [];
    }
  };

  const activeList = getActiveList();

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h1 className="text-3xl font-black text-white uppercase tracking-wider">CricVerse Leaderboard</h1>
              </div>
              <p className="text-gray-400 text-sm mt-1">
                Real-time player standings and championship performance logs.
              </p>
            </div>

            {/* Filter and socket indicator */}
            <div className="flex flex-wrap items-center gap-3">
              {liveMatchId && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#39ff14]/15 border border-[#39ff14]/30 text-[#39ff14] text-[10px] font-bold uppercase tracking-wider animate-pulse">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Real-time Live Sync</span>
                </div>
              )}

              <div className="flex items-center space-x-2 bg-[#1f2833]/25 border border-white/5 py-1.5 px-4 rounded-xl">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTournament}
                  onChange={handleTournamentChange}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0b0c10]">Global Rankings (All Matches)</option>
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id} className="bg-[#0b0c10]">{t.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => fetchLeaderboard(selectedTournament)}
                className="p-2.5 rounded-xl bg-[#1f2833]/30 border border-white/5 text-gray-400 hover:text-white transition duration-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Leaderboard tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab('batsmen')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'batsmen'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Top Batsmen
            </button>
            <button
              onClick={() => setActiveTab('bowlers')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'bowlers'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Top Bowlers
            </button>
            <button
              onClick={() => setActiveTab('sixes')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'sixes'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Power Hitters (Sixes)
            </button>
            <button
              onClick={() => setActiveTab('strikerate')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'strikerate'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Highest Strike Rate
            </button>
            <button
              onClick={() => setActiveTab('mvp')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'mvp'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              MVP Rankings
            </button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-32">
              <RefreshCw className="w-10 h-10 text-[#66fcf1] animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Leaderboard Table (2 cols on large screen) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-3 px-2 text-center w-12">Rank</th>
                          <th className="py-3 px-3">Player</th>
                          {activeTab === 'batsmen' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono">Strike Rate</th>
                            </>
                          )}
                          {activeTab === 'bowlers' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Wickets</th>
                              <th className="py-3 px-3 text-center font-mono">Economy</th>
                            </>
                          )}
                          {activeTab === 'sixes' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Sixes</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                            </>
                          )}
                          {activeTab === 'strikerate' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono">Balls Faced</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">S/R</th>
                            </>
                          )}
                          {activeTab === 'mvp' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono">Wickets</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">MVP Pts</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <AnimatePresence mode="popLayout">
                        <tbody>
                          {activeList.map((row, index) => (
                            <motion.tr
                              key={row._id}
                              initial={{ opacity: 0, y: 12 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -12 }}
                              transition={{ duration: 0.25, delay: index * 0.05 }}
                              className={`border-b border-white/5 hover:bg-white/5 transition duration-200 ${
                                index < 3 ? 'bg-[#1f2833]/15' : ''
                              }`}
                            >
                              {/* Rank column */}
                              <td className="py-4 px-2 text-center align-middle font-bold">
                                {renderRankBadge(index)}
                              </td>

                              {/* Player Profile details */}
                              <td className="py-4 px-3 align-middle">
                                <div className="flex items-center space-x-3">
                                  <div className="w-9 h-9 rounded-xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-sm overflow-hidden border border-white/5">
                                    {row.avatar ? (
                                      <img src={row.avatar} alt={row.name} className="w-full h-full object-cover" />
                                    ) : (
                                      row.name.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <div>
                                    <span className="font-bold text-white block hover:text-[#66fcf1] cursor-pointer">
                                      {row.name}
                                    </span>
                                    <span className="text-[10px] text-gray-500 uppercase block">{row.role}</span>
                                  </div>
                                </div>
                              </td>

                              {/* Conditional Columns based on tab selection */}
                              {activeTab === 'batsmen' && (
                                <>
                                  <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                  <td className="py-4 px-3 text-center font-mono font-bold text-emerald-400">
                                    {row.runs}
                                  </td>
                                  <td className="py-4 px-3 text-center font-mono text-[#66fcf1]">
                                    {row.strikeRate}
                                  </td>
                                </>
                              )}

                              {activeTab === 'bowlers' && (
                                <>
                                  <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                  <td className="py-4 px-3 text-center font-mono font-bold text-pink-400">
                                    {row.wickets}
                                  </td>
                                  <td className="py-4 px-3 text-center font-mono text-gray-300">
                                    {row.economy}
                                  </td>
                                </>
                              )}

                              {activeTab === 'sixes' && (
                                <>
                                  <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                  <td className="py-4 px-3 text-center font-mono font-bold text-yellow-400 flex items-center justify-center space-x-1">
                                    <Flame className="w-4 h-4 text-orange-500" />
                                    <span>{row.sixes}</span>
                                  </td>
                                  <td className="py-4 px-3 text-center font-mono">{row.runs}</td>
                                </>
                              )}

                              {activeTab === 'strikerate' && (
                                <>
                                  <td className="py-4 px-3 text-center font-mono">{row.balls}</td>
                                  <td className="py-4 px-3 text-center font-mono">{row.runs}</td>
                                  <td className="py-4 px-3 text-center font-mono font-bold text-[#66fcf1]">
                                    {row.strikeRate}
                                  </td>
                                </>
                              )}

                              {activeTab === 'mvp' && (
                                <>
                                  <td className="py-4 px-3 text-center font-mono text-gray-300">{row.runs}</td>
                                  <td className="py-4 px-3 text-center font-mono text-pink-400">{row.wickets}</td>
                                  <td className="py-4 px-3 text-center font-mono font-black text-purple-400 text-md">
                                    {row.mvpPoints}
                                  </td>
                                </>
                              )}
                            </motion.tr>
                          ))}

                          {activeList.length === 0 && (
                            <tr>
                              <td colSpan={5} className="py-12 text-center text-gray-600 italic">
                                No scorecard records found for this category.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </AnimatePresence>
                    </table>
                  </div>
                </div>
              </div>

              {/* Side Panels - Highlighted Leaders */}
              <div className="space-y-6">
                {/* MVP Standout Badge */}
                {activeList.length > 0 && (
                  <div className="glass-card p-6 border-purple-500/20 text-center relative overflow-hidden bg-gradient-to-br from-purple-950/20 to-indigo-950/10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>
                    <Award className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-bounce" />
                    
                    <span className="bg-purple-500/25 text-purple-300 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      Tournament STANDOUT MVP
                    </span>
                    
                    <h3 className="text-xl font-black text-white uppercase mt-4">
                      {activeTab === 'mvp' ? activeList[0]?.name : data.mvp[0]?.name || 'N/A'}
                    </h3>
                    
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
                      {activeTab === 'mvp' ? activeList[0]?.role : data.mvp[0]?.role || 'N/A'}
                    </p>

                    <div className="border-t border-purple-500/15 mt-6 pt-4 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Batting Runs</span>
                        <span className="text-lg font-black text-white font-mono">
                          {activeTab === 'mvp' ? activeList[0]?.runs : data.mvp[0]?.runs || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-500 font-bold block uppercase">Bowling Wkts</span>
                        <span className="text-lg font-black text-pink-400 font-mono">
                          {activeTab === 'mvp' ? activeList[0]?.wickets : data.mvp[0]?.wickets || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Score weights list info */}
                <div className="glass-card p-6 border-white/5 space-y-4">
                  <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-3">
                    MVP Points Weighting
                  </h4>
                  <ul className="text-xs text-gray-400 space-y-3 font-medium">
                    <li className="flex justify-between">
                      <span>Runs Scored</span>
                      <span className="text-white font-bold font-mono">1 Pt</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Fours Hit</span>
                      <span className="text-emerald-400 font-bold font-mono">+2 Pts</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Sixes Smashed</span>
                      <span className="text-yellow-400 font-bold font-mono">+4 Pts</span>
                    </li>
                    <li className="flex justify-between">
                      <span>Wickets Taken</span>
                      <span className="text-pink-400 font-bold font-mono">+25 Pts</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
