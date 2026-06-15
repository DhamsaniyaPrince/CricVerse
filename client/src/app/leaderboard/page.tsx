'use client';

import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Activity,
    AlertCircle,
    Award,
    Filter,
    Flame,
    Minus,
    RefreshCw,
    Search,
    Sparkles,
    TrendingDown,
    TrendingUp,
    Trophy
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

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
  levels?: any[];
  xp?: any[];
  achievements?: any[];
  allRounders?: any[];
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tournaments, setTournaments] = useState<TournamentItem[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>('');
  
  // Main Tabs: 'players' | 'teams' | 'tournaments' | 'records'
  const [mainTab, setMainTab] = useState<'players' | 'teams' | 'tournaments' | 'records'>('players');
  
  // Players Sub-Tabs: 'batsmen' | 'bowlers' | 'sixes' | 'strikerate' | 'mvp' | 'seasonMvp' | 'levels' | 'xp' | 'achievements' | 'all-rounders'
  const [playerSubTab, setPlayerSubTab] = useState<'batsmen' | 'bowlers' | 'sixes' | 'strikerate' | 'mvp' | 'seasonMvp' | 'levels' | 'xp' | 'achievements' | 'all-rounders'>('batsmen');
  const [seasonMvp, setSeasonMvp] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [playerData, setPlayerData] = useState<LeaderboardData>({
    batsmen: [],
    bowlers: [],
    strikeRates: [],
    sixes: [],
    mvp: [],
    levels: [],
    xp: [],
    achievements: [],
    allRounders: []
  });
  const [teamData, setTeamData] = useState<any[]>([]);
  const [tournamentStandings, setTournamentStandings] = useState<any[]>([]);
  const [historicalRecords, setHistoricalRecords] = useState<any | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Socket state
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

  const fetchLeaderboards = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Fetch Player stand lists
      const playerUrl = selectedTournament ? `/leaderboard?tournamentId=${selectedTournament}` : '/leaderboard';
      const playerRes = await api.get(playerUrl);
      if (playerRes.data.success) {
        const payload = playerRes.data.data;
        setPlayerData({
          batsmen: payload.batsmen || [],
          bowlers: payload.bowlers || [],
          strikeRates: payload.strikeRates || [],
          sixes: payload.sixes || [],
          mvp: payload.mvp || [],
          levels: payload.levels || [],
          xp: payload.xp || [],
          achievements: payload.achievements || [],
          allRounders: payload.allRounders || []
        });
      }

      // 2. Fetch Team Standings
      const teamUrl = selectedTournament ? `/leaderboard?type=teams&tournamentId=${selectedTournament}` : '/leaderboard?type=teams';
      const teamRes = await api.get(teamUrl);
      if (teamRes.data.success) {
        setTeamData(teamRes.data.data || []);
      }

      // 3. Fetch Historical Records
      const recordRes = await api.get('/leaderboard?type=records');
      if (recordRes.data.success) {
        setHistoricalRecords(recordRes.data.data);
      }

      // 4. Fetch Tournament specific standings (if selected)
      if (selectedTournament) {
        setTournamentStandings(teamRes.data.data || []);
      }

      // 5. Fetch Season MVP Leaderboard
      const seasonMvpRes = await api.get('/awards/season');
      if (seasonMvpRes.data.success) {
        setSeasonMvp(seasonMvpRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Error fetching leaderboard datasets:', err);
      setError(err.response?.data?.message || 'Failed to load leaderboard standings. Please verify connection.');
    } finally {
      setIsLoading(false);
    }
  };

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
    fetchLeaderboards();
  }, []);

  useEffect(() => {
    fetchLeaderboards();
  }, [selectedTournament]);

  // Connect to live socket
  useEffect(() => {
    if (!liveMatchId) return;

    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://process.env.NEXT_PUBLIC_API_URLgit status', {
      transports: ['websocket'],
      upgrade: false
    });

    socket.on('connect', () => {
      socket.emit('join_match_room', liveMatchId);
    });

    socket.on('match:update', () => {
      fetchLeaderboards();
    });

    return () => {
      socket.emit('leave_match_room', liveMatchId);
      socket.disconnect();
    };
  }, [liveMatchId, selectedTournament]);

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black text-[11px] shadow-lg shadow-yellow-500/20 border border-yellow-300">
          1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-r from-slate-300 to-slate-400 text-black font-black text-[11px] border border-slate-100">
          2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-r from-amber-600 to-amber-700 text-white font-black text-[11px] border border-amber-500">
          3rd
        </span>
      );
    }
    return <span className="text-gray-500 font-mono text-xs font-bold">#{rank}</span>;
  };

  const renderTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') {
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    }
    if (trend === 'down') {
      return <TrendingDown className="w-4 h-4 text-rose-500" />;
    }
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  const renderFormPills = (form: string[]) => {
    if (!form || form.length === 0) return <span className="text-gray-600">-</span>;
    return (
      <div className="flex items-center space-x-1 justify-center">
        {form.map((res, i) => {
          let color = 'bg-gray-800 text-gray-400';
          if (res === 'W') color = 'bg-emerald-950/45 text-emerald-400 border border-emerald-500/25';
          if (res === 'L') color = 'bg-rose-950/45 text-rose-400 border border-rose-500/25';
          if (res === 'T') color = 'bg-amber-950/45 text-amber-400 border border-amber-500/25';
          return (
            <span key={i} className={`w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black ${color}`}>
              {res}
            </span>
          );
        })}
      </div>
    );
  };

  // Get list based on active sub tab
  const getActivePlayerList = () => {
    switch (playerSubTab) {
      case 'batsmen':
        return playerData.batsmen;
      case 'bowlers':
        return playerData.bowlers;
      case 'strikerate':
        return playerData.strikeRates;
      case 'sixes':
        return playerData.sixes;
      case 'mvp':
        return playerData.mvp;
      case 'levels':
        return playerData.levels || [];
      case 'xp':
        return playerData.xp || [];
      case 'achievements':
        return playerData.achievements || [];
      case 'all-rounders':
        return playerData.allRounders || [];
      case 'seasonMvp':
        return seasonMvp;
      default:
        return [];
    }
  };

  // Get active list for rendering
  const activePlayerList = getActivePlayerList();

  // Filter lists
  const filteredPlayers = activePlayerList.filter((p: any) => {
    const matchesSearch = p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.team?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter ? p.role === roleFilter : true;
    
    // Support battingStyle checking (handling Right-hand bat / Left-hand bat)
    const matchesStyle = styleFilter 
      ? (p.battingStyle === styleFilter || (styleFilter === 'Right-hand bat' && p.battingStyle?.includes('Right')) || (styleFilter === 'Left-hand bat' && p.battingStyle?.includes('Left')))
      : true;

    return matchesSearch && matchesRole && matchesStyle;
  });

  const filteredTeams = teamData.filter((t: any) => {
    return t.name?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Top Cap holders from the arrays
  const orangeCapHolder = playerData.batsmen[0];
  const purpleCapHolder = playerData.bowlers[0];
  const goldMvpHolder = playerData.mvp[0];

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Dashboard Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
            <div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-8 h-8 text-yellow-500 animate-pulse" />
                <h1 className="text-3xl font-black text-white uppercase tracking-wider">CricVerse Leaderboards</h1>
              </div>
              <p className="text-gray-400 text-xs mt-1">
                Real-time championship league tables, dynamic ranking curves, and historical hall of fame.
              </p>
            </div>

            {/* Global Filters */}
            <div className="flex flex-wrap items-center gap-3">
              {liveMatchId && (
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#39ff14]/15 border border-[#39ff14]/30 text-[#39ff14] text-[9px] font-black uppercase tracking-wider animate-pulse">
                  <Activity className="w-3 h-3" />
                  <span>Live sync active</span>
                </div>
              )}

              <div className="flex items-center space-x-2 bg-[#1f2833]/20 border border-white/5 py-1.5 px-4 rounded-xl">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={selectedTournament}
                  onChange={(e) => setSelectedTournament(e.target.value)}
                  className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                >
                  <option value="" className="bg-[#0b0c10]">Global Standings (All Tournaments)</option>
                  {tournaments.map(t => (
                    <option key={t._id} value={t._id} className="bg-[#0b0c10]">{t.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={fetchLeaderboards}
                className="p-2.5 rounded-xl bg-[#1f2833]/30 border border-white/5 text-gray-400 hover:text-white transition duration-200"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CAP HOLDERS ROW (Top Athletes of the league) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Orange Cap (Leading Run Scorer) */}
            <div 
              onClick={() => orangeCapHolder && router.push(`/players/${orangeCapHolder._id}`)}
              className="glass-card p-5 border-orange-500/20 bg-gradient-to-br from-orange-950/10 to-transparent hover:border-orange-500/40 transition duration-300 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  ORANGE CAP HOLDER
                </span>
                <Sparkles className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 border-2 border-orange-500/30 overflow-hidden flex items-center justify-center font-bold text-white text-xl">
                  {orangeCapHolder?.avatar ? (
                    <img src={orangeCapHolder.avatar} alt={orangeCapHolder.name} className="w-full h-full object-cover" />
                  ) : (
                    orangeCapHolder?.name.charAt(0).toUpperCase() || 'P'
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase leading-tight group-hover:text-orange-400 transition">{orangeCapHolder?.name || 'No Records'}</h3>
                  <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold flex items-center space-x-1">
                    {orangeCapHolder?.team?.logo && (
                      <img src={orangeCapHolder.team.logo} className="w-3.5 h-3.5 rounded-sm object-cover mr-1" />
                    )}
                    <span>{orangeCapHolder?.team?.name || 'Free Agent'}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 mt-4 pt-3 text-xs">
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Total Runs</span>
                  <span className="text-sm font-black text-orange-400 font-mono mt-0.5 block">{orangeCapHolder?.runs || 0} Runs</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Strike Rate</span>
                  <span className="text-sm font-black text-white font-mono mt-0.5 block">{orangeCapHolder?.strikeRate || '0.0'}</span>
                </div>
              </div>
            </div>

            {/* Purple Cap (Leading Wicket Taker) */}
            <div 
              onClick={() => purpleCapHolder && router.push(`/players/${purpleCapHolder._id}`)}
              className="glass-card p-5 border-purple-500/20 bg-gradient-to-br from-purple-950/10 to-transparent hover:border-purple-500/40 transition duration-300 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-purple-500/20 text-purple-400 border border-purple-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  PURPLE CAP HOLDER
                </span>
                <Sparkles className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 border-2 border-purple-500/30 overflow-hidden flex items-center justify-center font-bold text-white text-xl">
                  {purpleCapHolder?.avatar ? (
                    <img src={purpleCapHolder.avatar} alt={purpleCapHolder.name} className="w-full h-full object-cover" />
                  ) : (
                    purpleCapHolder?.name.charAt(0).toUpperCase() || 'P'
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase leading-tight group-hover:text-purple-400 transition">{purpleCapHolder?.name || 'No Records'}</h3>
                  <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold flex items-center space-x-1">
                    {purpleCapHolder?.team?.logo && (
                      <img src={purpleCapHolder.team.logo} className="w-3.5 h-3.5 rounded-sm object-cover mr-1" />
                    )}
                    <span>{purpleCapHolder?.team?.name || 'Free Agent'}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 mt-4 pt-3 text-xs">
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Wickets</span>
                  <span className="text-sm font-black text-purple-400 font-mono mt-0.5 block">{purpleCapHolder?.wickets || 0} wkts</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Economy</span>
                  <span className="text-sm font-black text-white font-mono mt-0.5 block">{purpleCapHolder?.economy || '0.00'}</span>
                </div>
              </div>
            </div>

            {/* Golden Ball (Most Valuable Player) */}
            <div 
              onClick={() => goldMvpHolder && router.push(`/players/${goldMvpHolder._id}`)}
              className="glass-card p-5 border-amber-500/20 bg-gradient-to-br from-amber-950/10 to-transparent hover:border-amber-500/40 transition duration-300 cursor-pointer relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition"></div>
              <div className="flex items-center justify-between mb-3">
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/20 text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  GOLDEN MVP LEADER
                </span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-900 border-2 border-amber-500/30 overflow-hidden flex items-center justify-center font-bold text-white text-xl">
                  {goldMvpHolder?.avatar ? (
                    <img src={goldMvpHolder.avatar} alt={goldMvpHolder.name} className="w-full h-full object-cover" />
                  ) : (
                    goldMvpHolder?.name.charAt(0).toUpperCase() || 'P'
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-sm uppercase leading-tight group-hover:text-amber-400 transition">{goldMvpHolder?.name || 'No Records'}</h3>
                  <p className="text-[10px] text-gray-400 uppercase mt-0.5 font-bold flex items-center space-x-1">
                    {goldMvpHolder?.team?.logo && (
                      <img src={goldMvpHolder.team.logo} className="w-3.5 h-3.5 rounded-sm object-cover mr-1" />
                    )}
                    <span>{goldMvpHolder?.team?.name || 'Free Agent'}</span>
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 border-t border-white/5 mt-4 pt-3 text-xs">
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">MVP Points</span>
                  <span className="text-sm font-black text-amber-400 font-mono mt-0.5 block">{goldMvpHolder?.mvpPoints || 0} Pts</span>
                </div>
                <div>
                  <span className="text-[9px] text-gray-500 block uppercase font-bold">Role</span>
                  <span className="text-[10px] font-black text-white uppercase truncate mt-1 block">{goldMvpHolder?.role || 'All-Rounder'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN TABS MENU */}
          <div className="flex border-b border-[#66fcf1]/15 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setMainTab('players')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                mainTab === 'players' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Player Standings
            </button>
            <button
              onClick={() => setMainTab('teams')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                mainTab === 'teams' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Team Standings
            </button>
            <button
              onClick={() => setMainTab('tournaments')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                mainTab === 'tournaments' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Tournament Tables
            </button>
            <button
              onClick={() => setMainTab('records')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                mainTab === 'records' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Historical Records
            </button>
          </div>

          {/* SEARCH & FILTERS ROW */}
          {mainTab !== 'records' && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-5 bg-[#1f2833]/10 border border-white/5 rounded-2xl mb-6">
              {/* Search Bar */}
              <div className="sm:col-span-2 relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder={mainTab === 'teams' ? "Search team name..." : "Search player or team..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-[#66fcf1]"
                />
              </div>

              {/* Player specific filters */}
              {mainTab === 'players' && (
                <>
                  {/* Role dropdown */}
                  <div className="flex items-center space-x-2 bg-[#0b0c10] border border-white/10 px-3 py-2 rounded-xl">
                    <select
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="bg-transparent text-xs text-gray-400 focus:outline-none w-full cursor-pointer"
                    >
                      <option value="" className="bg-[#0b0c10]">All Position Roles</option>
                      <option value="Batsman" className="bg-[#0b0c10]">Batsman</option>
                      <option value="Bowler" className="bg-[#0b0c10]">Bowler</option>
                      <option value="All-Rounder" className="bg-[#0b0c10]">All-Rounder</option>
                      <option value="Wicket-Keeper" className="bg-[#0b0c10]">Wicket-Keeper</option>
                    </select>
                  </div>

                  {/* Batting Hand Dropdown */}
                  <div className="flex items-center space-x-2 bg-[#0b0c10] border border-white/10 px-3 py-2 rounded-xl">
                    <select
                      value={styleFilter}
                      onChange={(e) => setStyleFilter(e.target.value)}
                      className="bg-transparent text-xs text-gray-400 focus:outline-none w-full cursor-pointer"
                    >
                      <option value="" className="bg-[#0b0c10]">All Batting Styles</option>
                      <option value="Right-hand bat" className="bg-[#0b0c10]">Right-Hand Bat</option>
                      <option value="Left-hand bat" className="bg-[#0b0c10]">Left-Hand Bat</option>
                    </select>
                  </div>
                </>
              )}

              {/* Tournament table selector context reminder */}
              {mainTab === 'tournaments' && (
                <div className="sm:col-span-2 flex items-center justify-end">
                  <span className="text-[10px] text-gray-500 font-bold uppercase mr-2">Selected Tournament:</span>
                  <strong className="text-xs text-[#66fcf1] uppercase">
                    {tournaments.find(t => t._id === selectedTournament)?.name || 'CPL 2026'}
                  </strong>
                </div>
              )}
            </div>
          )}

          {/* SUB-TABS NAVIGATION FOR PLAYERS */}
          {mainTab === 'players' && (
            <div className="flex flex-wrap gap-2.5 mb-6">
              <button
                onClick={() => setPlayerSubTab('batsmen')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'batsmen'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Top Batsmen (Runs)
              </button>
              <button
                onClick={() => setPlayerSubTab('bowlers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'bowlers'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Top Bowlers (Wickets)
              </button>
              <button
                onClick={() => setPlayerSubTab('sixes')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'sixes'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Power Hitters (Sixes)
              </button>
              <button
                onClick={() => setPlayerSubTab('strikerate')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'strikerate'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Highest Strike Rate
              </button>
              <button
                onClick={() => setPlayerSubTab('mvp')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'mvp'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                MVP Points Standing
              </button>
              <button
                onClick={() => setPlayerSubTab('seasonMvp')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'seasonMvp'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Season MVP
              </button>
              <button
                onClick={() => setPlayerSubTab('levels')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'levels'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Highest Level
              </button>
              <button
                onClick={() => setPlayerSubTab('xp')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'xp'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Most XP
              </button>
              <button
                onClick={() => setPlayerSubTab('achievements')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'achievements'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Most Badges
              </button>
              <button
                onClick={() => setPlayerSubTab('all-rounders')}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition duration-200 ${
                  playerSubTab === 'all-rounders'
                    ? 'bg-[#66fcf1]/15 border border-[#66fcf1]/30 text-[#66fcf1] shadow-[0_0_15px_rgba(102,252,241,0.05)]'
                    : 'bg-[#1f2833]/20 border border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                Top All-Rounders
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="h-6 bg-white/10 rounded w-1/4 animate-pulse"></div>
                <div className="h-6 bg-white/10 rounded w-32 animate-pulse"></div>
              </div>
              <div className="space-y-3.5">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div key={idx} className="flex items-center justify-between py-2.5 border-b border-white/5 animate-pulse">
                    <div className="flex items-center space-x-4 w-1/3">
                      <div className="w-8 h-8 rounded-lg bg-white/10"></div>
                      <div className="space-y-1.5 flex-1">
                        <div className="h-4 bg-white/10 rounded w-3/4"></div>
                        <div className="h-3 bg-white/5 rounded w-1/2"></div>
                      </div>
                    </div>
                    <div className="h-4 bg-white/10 rounded w-24"></div>
                    <div className="h-4 bg-white/10 rounded w-16"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="glass-card p-12 text-center border-red-500/20 max-w-xl mx-auto space-y-4 shadow-lg shadow-red-500/5">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider">Failed to load Standings</h3>
                <p className="text-red-300 text-xs mt-1 leading-relaxed">{error}</p>
              </div>
              <button
                onClick={() => fetchLeaderboards()}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer"
              >
                Retry Load
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* TAB 1: PLAYER STANDINGS */}
              {mainTab === 'players' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-6 border-[#66fcf1]/10"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-3 px-2 text-center w-12">Rank</th>
                          <th className="py-3 px-2 text-center w-10">Trend</th>
                          <th className="py-3 px-3">Player</th>
                          <th className="py-3 px-3">Active Team</th>
                          {playerSubTab === 'batsmen' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono">S/R</th>
                            </>
                          )}
                          {playerSubTab === 'bowlers' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Wickets</th>
                              <th className="py-3 px-3 text-center font-mono">Economy</th>
                            </>
                          )}
                          {playerSubTab === 'sixes' && (
                            <>
                              <th className="py-3 px-3 text-center">Matches</th>
                              <th className="py-3 px-3 text-center font-mono">Sixes</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                            </>
                          )}
                          {playerSubTab === 'strikerate' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono">Balls Faced</th>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">S/R</th>
                            </>
                          )}
                          {playerSubTab === 'mvp' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono">Runs</th>
                              <th className="py-3 px-3 text-center font-mono">Wickets</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">MVP Pts</th>
                            </>
                          )}
                          {playerSubTab === 'seasonMvp' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono">Matches</th>
                              <th className="py-3 px-3 text-center font-mono font-bold text-orange-400">Runs</th>
                              <th className="py-3 px-3 text-center font-mono font-bold text-pink-400">Wkts</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">Season MVP</th>
                            </>
                          )}
                          {playerSubTab === 'levels' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono font-bold text-[#66fcf1]">Level</th>
                              <th className="py-3 px-3 text-center font-mono">Total XP</th>
                              <th className="py-3 px-3 text-center">Rank</th>
                            </>
                          )}
                          {playerSubTab === 'xp' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono font-bold text-[#66fcf1]">Total XP</th>
                              <th className="py-3 px-3 text-center font-mono">Level</th>
                              <th className="py-3 px-3 text-center">Rank</th>
                            </>
                          )}
                          {playerSubTab === 'achievements' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono font-bold text-[#66fcf1]">Badges</th>
                              <th className="py-3 px-3 text-center font-mono">Level</th>
                              <th className="py-3 px-3 text-center">Rank</th>
                            </>
                          )}
                          {playerSubTab === 'all-rounders' && (
                            <>
                              <th className="py-3 px-3 text-center font-mono text-emerald-400 font-bold">Runs</th>
                              <th className="py-3 px-3 text-center font-mono text-pink-400 font-bold">Wickets</th>
                              <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">Total XP</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPlayers.map((row, idx) => (
                          <tr
                            key={row._id}
                            className={`border-b border-white/5 hover:bg-white/5 transition duration-200 ${
                              idx < 3 ? 'bg-[#1f2833]/10' : ''
                            }`}
                          >
                            <td className="py-4 px-2 text-center align-middle font-bold">
                              {renderRankBadge(idx + 1)}
                            </td>
                            <td className="py-4 px-2 text-center align-middle">
                              {renderTrendIcon(row.trend)}
                            </td>
                            <td className="py-4 px-3 align-middle">
                              <div 
                                onClick={() => router.push(`/player/${row.username || row._id}`)}
                                className="flex items-center space-x-3 cursor-pointer group"
                              >
                                <div className="w-9 h-9 rounded-xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-sm overflow-hidden border border-white/5">
                                  {row.avatar ? (
                                    <img src={row.avatar} alt={row.name} className="w-full h-full object-cover" />
                                  ) : (
                                    row.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="font-bold text-white block group-hover:text-[#66fcf1] transition">
                                      {row.name}
                                    </span>
                                    {row.achievements && row.achievements.length > 0 && (
                                      <div className="flex items-center gap-1">
                                        {row.achievements.map((ach: any) => {
                                          let badgeStyle = "bg-gray-800 text-gray-400 border border-white/5";
                                          let label = ach.title;
                                          if (ach.title === 'MVP') badgeStyle = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
                                          else if (ach.title === 'Top Performer') {
                                            badgeStyle = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
                                            label = "TOP";
                                          }
                                          else if (ach.title === 'Tournament Winner') {
                                            badgeStyle = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
                                            label = "WINNER";
                                          }
                                          else if (ach.title === 'Winning Streak') {
                                            badgeStyle = "bg-orange-500/20 text-orange-300 border border-orange-500/30";
                                            label = "STREAK";
                                          }
                                          else if (ach.title === 'Team Legend') {
                                            badgeStyle = "bg-purple-500/20 text-purple-300 border border-purple-500/30";
                                            label = "LEGEND";
                                          }
                                          return (
                                            <span 
                                              key={ach.title} 
                                              title={`${ach.title}: ${ach.description}`} 
                                              className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${badgeStyle}`}
                                            >
                                              {label}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-gray-500 uppercase block">{row.role}</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-3 align-middle">
                              {row.team ? (
                                <div 
                                  onClick={() => router.push(`/teams/${row.team._id}`)}
                                  className="flex items-center space-x-2 cursor-pointer group"
                                >
                                  {row.team.logo && (
                                    <img src={row.team.logo} className="w-4 h-4 rounded-sm object-cover" />
                                  )}
                                  <span className="text-xs font-bold text-gray-300 group-hover:text-[#66fcf1] transition">{row.team.name}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-gray-600">Free Agent</span>
                              )}
                            </td>

                            {playerSubTab === 'batsmen' && (
                              <>
                                <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-emerald-400">{row.runs}</td>
                                <td className="py-4 px-3 text-center font-mono text-[#66fcf1]">{row.strikeRate}</td>
                              </>
                            )}
                            {playerSubTab === 'bowlers' && (
                              <>
                                <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-pink-400">{row.wickets}</td>
                                <td className="py-4 px-3 text-center font-mono text-gray-300">{row.economy}</td>
                              </>
                            )}
                            {playerSubTab === 'sixes' && (
                              <>
                                <td className="py-4 px-3 text-center text-white">{row.matchCount}</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-yellow-400">
                                  <div className="flex items-center justify-center space-x-1">
                                    <Flame className="w-4 h-4 text-orange-500 fill-current" />
                                    <span>{row.sixes}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-3 text-center font-mono">{row.runs}</td>
                              </>
                            )}
                            {playerSubTab === 'strikerate' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono">{row.balls}</td>
                                <td className="py-4 px-3 text-center font-mono">{row.runs}</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-[#66fcf1]">{row.strikeRate}</td>
                              </>
                            )}
                            {playerSubTab === 'mvp' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono text-gray-300">{row.runs}</td>
                                <td className="py-4 px-3 text-center font-mono text-pink-400">{row.wickets}</td>
                                <td className="py-4 px-3 text-center font-mono font-black text-purple-400">{row.mvpPoints}</td>
                              </>
                            )}
                            {playerSubTab === 'seasonMvp' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono text-gray-300">{row.matchesCount}</td>
                                <td className="py-4 px-3 text-center font-mono text-orange-400 font-bold">{row.totalRuns}</td>
                                <td className="py-4 px-3 text-center font-mono text-pink-400 font-bold">{row.totalWickets}</td>
                                <td className="py-4 px-3 text-center font-mono font-black text-yellow-400">{row.totalMvpScore}</td>
                              </>
                            )}
                            {playerSubTab === 'levels' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono font-black text-white">LVL {row.playerLevel || 1}</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-[#66fcf1]">{row.playerXP || 0} XP</td>
                                <td className="py-4 px-3 text-center text-xs font-bold text-gray-400">{row.careerRank || '🏏 Rookie'}</td>
                              </>
                            )}
                            {playerSubTab === 'xp' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono font-black text-[#66fcf1]">{row.playerXP || 0} XP</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-white">LVL {row.playerLevel || 1}</td>
                                <td className="py-4 px-3 text-center text-xs font-bold text-gray-400">{row.careerRank || '🏏 Rookie'}</td>
                              </>
                            )}
                            {playerSubTab === 'achievements' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono font-black text-yellow-400">{row.badges?.length || 0} Badges</td>
                                <td className="py-4 px-3 text-center font-mono font-bold text-white">LVL {row.playerLevel || 1}</td>
                                <td className="py-4 px-3 text-center text-xs font-bold text-gray-400">{row.careerRank || '🏏 Rookie'}</td>
                              </>
                            )}
                            {playerSubTab === 'all-rounders' && (
                              <>
                                <td className="py-4 px-3 text-center font-mono text-emerald-400 font-bold">{row.stats?.batting?.runs || 0}</td>
                                <td className="py-4 px-3 text-center font-mono text-pink-400 font-bold">{row.stats?.bowling?.wickets || 0}</td>
                                <td className="py-4 px-3 text-center font-mono font-black text-[#66fcf1]">{row.playerXP || 0} XP</td>
                              </>
                            )}
                          </tr>
                        ))}

                        {filteredPlayers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="py-16 text-center">
                              <div className="flex flex-col items-center justify-center space-y-3.5 max-w-sm mx-auto">
                                <Search className="w-10 h-10 text-gray-500 animate-bounce" />
                                <div>
                                  <h4 className="font-bold text-white uppercase text-xs tracking-wider">No Matching Players</h4>
                                  <p className="text-gray-500 text-[10px] leading-relaxed mt-1">
                                    We couldn't find any players matching "{searchTerm}". Try checking your spelling or adjusting filters.
                                  </p>
                                </div>
                                <button
                                  onClick={() => { setSearchTerm(''); setRoleFilter(''); setStyleFilter(''); }}
                                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#66fcf1] hover:text-[#0b0c10] text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer"
                                >
                                  Reset All Filters
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* TAB 2: TEAM STANDINGS */}
              {mainTab === 'teams' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-6 border-[#66fcf1]/10"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-3 px-2 text-center w-12">Rank</th>
                          <th className="py-3 px-2 text-center w-10">Trend</th>
                          <th className="py-3 px-3">Team</th>
                          <th className="py-3 px-3 text-center">Played</th>
                          <th className="py-3 px-3 text-center">Won</th>
                          <th className="py-3 px-3 text-center">Lost</th>
                          <th className="py-3 px-3 text-center">Tied</th>
                          <th className="py-3 px-3 text-center font-mono">Win %</th>
                          <th className="py-3 px-3 text-center">Recent Form</th>
                          <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTeams.map((row, idx) => (
                          <tr
                            key={row._id}
                            className={`border-b border-white/5 hover:bg-white/5 transition duration-200 ${
                              idx < 3 ? 'bg-[#1f2833]/10' : ''
                            }`}
                          >
                            <td className="py-4 px-2 text-center align-middle font-bold">
                              {renderRankBadge(idx + 1)}
                            </td>
                            <td className="py-4 px-2 text-center align-middle">
                              {renderTrendIcon(row.trend)}
                            </td>
                            <td className="py-4 px-3 align-middle">
                              <div 
                                onClick={() => router.push(`/teams/${row._id}`)}
                                className="flex items-center space-x-3 cursor-pointer group"
                              >
                                <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center font-bold text-white overflow-hidden border border-white/5">
                                  {row.logo ? (
                                    <img src={row.logo} alt={row.name} className="w-full h-full object-cover" />
                                  ) : (
                                    row.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <span className="font-bold text-white group-hover:text-[#66fcf1] transition">
                                  {row.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center text-white">{row.played}</td>
                            <td className="py-4 px-3 text-center text-emerald-400 font-bold">{row.won}</td>
                            <td className="py-4 px-3 text-center text-rose-500">{row.lost}</td>
                            <td className="py-4 px-3 text-center text-amber-500">{row.tied}</td>
                            <td className="py-4 px-3 text-center font-mono font-bold text-white">{row.winRate || (row.played > 0 ? ((row.won / row.played) * 100).toFixed(1) : '0.0')}%</td>
                            <td className="py-4 px-3 text-center">
                              {renderFormPills(row.form)}
                            </td>
                            <td className="py-4 px-3 text-center font-mono font-black text-[#66fcf1] text-md">{row.points}</td>
                          </tr>
                        ))}

                        {filteredTeams.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-16 text-center">
                              <div className="flex flex-col items-center justify-center space-y-3.5 max-w-sm mx-auto">
                                <Search className="w-10 h-10 text-gray-500 animate-bounce" />
                                <div>
                                  <h4 className="font-bold text-white uppercase text-xs tracking-wider">No Matching Teams</h4>
                                  <p className="text-gray-500 text-[10px] leading-relaxed mt-1">
                                    We couldn't find any teams matching "{searchTerm}". Try adjusting your spelling.
                                  </p>
                                </div>
                                <button
                                  onClick={() => setSearchTerm('')}
                                  className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-[#66fcf1] hover:text-[#0b0c10] text-xs font-bold uppercase tracking-wider rounded-xl transition duration-200 cursor-pointer"
                                >
                                  Clear Search
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* TAB 3: TOURNAMENT STANDINGS */}
              {mainTab === 'tournaments' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="glass-card p-6 border-[#66fcf1]/10"
                >
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] font-mono">
                        Official Tournament Points Table
                      </h3>
                      <p className="text-[10px] text-gray-500 uppercase mt-0.5 font-bold">
                        Sorted by Points, Net Run Rate (NRR), and Wins
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 bg-[#0b0c10] border border-white/10 py-1.5 px-4 rounded-xl">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Select Tournament:</span>
                      <select
                        value={selectedTournament}
                        onChange={(e) => setSelectedTournament(e.target.value)}
                        className="bg-transparent text-xs text-white focus:outline-none cursor-pointer font-bold"
                      >
                        {tournaments.map(t => (
                          <option key={t._id} value={t._id} className="bg-[#0b0c10]">{t.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-3 px-2 text-center w-12">Rank</th>
                          <th className="py-3 px-3">Team</th>
                          <th className="py-3 px-3 text-center">Played</th>
                          <th className="py-3 px-3 text-center">Won</th>
                          <th className="py-3 px-3 text-center">Lost</th>
                          <th className="py-3 px-3 text-center">Tied</th>
                          <th className="py-3 px-3 text-center font-mono">NRR</th>
                          <th className="py-3 px-3 text-center font-mono text-[10px]">Runs Scored</th>
                          <th className="py-3 px-3 text-center font-mono text-[10px]">Runs Conceded</th>
                          <th className="py-3 px-3 text-center font-mono text-[#66fcf1]">Points</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tournamentStandings.map((row, idx) => (
                          <tr
                            key={row._id}
                            className={`border-b border-white/5 hover:bg-white/5 transition duration-200 ${
                              idx === 0 ? 'bg-emerald-950/5' : ''
                            }`}
                          >
                            <td className="py-4 px-2 text-center align-middle font-bold">
                              {renderRankBadge(idx + 1)}
                            </td>
                            <td className="py-4 px-3 align-middle">
                              <div 
                                onClick={() => router.push(`/teams/${row._id}`)}
                                className="flex items-center space-x-3 cursor-pointer group"
                              >
                                <div className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center font-bold text-white overflow-hidden border border-white/5">
                                  {row.logo ? (
                                    <img src={row.logo} alt={row.name} className="w-full h-full object-cover" />
                                  ) : (
                                    row.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <span className="font-bold text-white group-hover:text-[#66fcf1] transition">
                                  {row.name}
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-3 text-center text-white">{row.played}</td>
                            <td className="py-4 px-3 text-center text-emerald-400 font-bold">{row.won}</td>
                            <td className="py-4 px-3 text-center text-rose-500">{row.lost}</td>
                            <td className="py-4 px-3 text-center text-amber-500">{row.tied}</td>
                            <td className={`py-4 px-3 text-center font-mono font-bold ${row.nrr >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                              {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                            </td>
                            <td className="py-4 px-3 text-center font-mono text-gray-300">
                              {row.runsScored || 0} <span className="text-[10px] text-gray-600">({Math.floor((row.ballsFaced || 0) / 6)} overs)</span>
                            </td>
                            <td className="py-4 px-3 text-center font-mono text-gray-300">
                              {row.runsConceded || 0} <span className="text-[10px] text-gray-600">({Math.floor((row.ballsBowled || 0) / 6)} overs)</span>
                            </td>
                            <td className="py-4 px-3 text-center font-mono font-black text-[#66fcf1] text-md">{row.points}</td>
                          </tr>
                        ))}

                        {tournamentStandings.length === 0 && (
                          <tr>
                            <td colSpan={10} className="py-12 text-center text-gray-600 italic">
                              No points table standings initialized. Generate matches to fill the table.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* TAB 4: HISTORICAL RECORDS */}
              {mainTab === 'records' && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-6"
                >
                  <div className="flex items-center space-x-2 text-[#66fcf1]">
                    <Award className="w-5 h-5" />
                    <h3 className="text-sm font-bold uppercase tracking-wider font-mono">CricVerse Hall of Fame Records</h3>
                  </div>

                  {historicalRecords ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Innings Score Record */}
                      {historicalRecords.highestIndividualScore && (
                        <div className="glass-card p-5 border-amber-500/20 bg-gradient-to-br from-amber-950/10 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-amber-500/40 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">INDIVIDUAL MATCH RUNS</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-amber-400 transition">{historicalRecords.highestIndividualScore.title}</h4>
                            <strong className="text-xl font-black font-mono text-white block mt-3 leading-none">{historicalRecords.highestIndividualScore.value}</strong>
                            <span className="text-[10px] text-gray-500 block truncate mt-2">{historicalRecords.highestIndividualScore.match}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/players/${historicalRecords.highestIndividualScore.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.highestIndividualScore.holderAvatar ? (
                                  <img src={historicalRecords.highestIndividualScore.holderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.highestIndividualScore.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.highestIndividualScore.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">{new Date(historicalRecords.highestIndividualScore.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Best Bowling Figure */}
                      {historicalRecords.bestBowlingFigures && (
                        <div className="glass-card p-5 border-pink-500/20 bg-gradient-to-br from-pink-950/10 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-pink-500/40 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-pink-500 uppercase tracking-widest block mb-1">INDIVIDUAL MATCH WICKETS</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-pink-400 transition">{historicalRecords.bestBowlingFigures.title}</h4>
                            <strong className="text-xl font-black font-mono text-white block mt-3 leading-none">{historicalRecords.bestBowlingFigures.value}</strong>
                            <span className="text-[10px] text-gray-500 block truncate mt-2">{historicalRecords.bestBowlingFigures.match}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/players/${historicalRecords.bestBowlingFigures.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.bestBowlingFigures.holderAvatar ? (
                                  <img src={historicalRecords.bestBowlingFigures.holderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.bestBowlingFigures.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.bestBowlingFigures.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">{new Date(historicalRecords.bestBowlingFigures.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Team Total Record */}
                      {historicalRecords.highestTeamTotal && (
                        <div className="glass-card p-5 border-[#66fcf1]/20 bg-gradient-to-br from-[#66fcf1]/5 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-[#66fcf1]/45 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-[#66fcf1] uppercase tracking-widest block mb-1">TEAM MATCH TOTAL</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-[#66fcf1] transition">{historicalRecords.highestTeamTotal.title}</h4>
                            <strong className="text-xl font-black font-mono text-white block mt-3 leading-none">{historicalRecords.highestTeamTotal.value}</strong>
                            <span className="text-[10px] text-gray-500 block truncate mt-2">{historicalRecords.highestTeamTotal.match}</span>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/teams/${historicalRecords.highestTeamTotal.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.highestTeamTotal.holderLogo ? (
                                  <img src={historicalRecords.highestTeamTotal.holderLogo} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.highestTeamTotal.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.highestTeamTotal.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">{new Date(historicalRecords.highestTeamTotal.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Most Career Runs */}
                      {historicalRecords.mostCareerRuns && (
                        <div className="glass-card p-5 border-emerald-500/20 bg-gradient-to-br from-emerald-950/10 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-emerald-500/40 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">CAREER runs RECORD</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-emerald-400 transition">{historicalRecords.mostCareerRuns.title}</h4>
                            <strong className="text-xl font-black font-mono text-emerald-400 block mt-3 leading-none">{historicalRecords.mostCareerRuns.value}</strong>
                            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">All-Time leading runscorer</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/players/${historicalRecords.mostCareerRuns.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.mostCareerRuns.holderAvatar ? (
                                  <img src={historicalRecords.mostCareerRuns.holderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.mostCareerRuns.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.mostCareerRuns.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">ACTIVE</span>
                          </div>
                        </div>
                      )}

                      {/* Most Career Wickets */}
                      {historicalRecords.mostCareerWickets && (
                        <div className="glass-card p-5 border-purple-500/20 bg-gradient-to-br from-purple-950/10 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-purple-500/40 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest block mb-1">CAREER wickets RECORD</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-purple-400 transition">{historicalRecords.mostCareerWickets.title}</h4>
                            <strong className="text-xl font-black font-mono text-purple-400 block mt-3 leading-none">{historicalRecords.mostCareerWickets.value}</strong>
                            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">All-Time leading wicket taker</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/players/${historicalRecords.mostCareerWickets.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.mostCareerWickets.holderAvatar ? (
                                  <img src={historicalRecords.mostCareerWickets.holderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.mostCareerWickets.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.mostCareerWickets.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">ACTIVE</span>
                          </div>
                        </div>
                      )}

                      {/* Most Career Sixes */}
                      {historicalRecords.mostCareerSixes && (
                        <div className="glass-card p-5 border-yellow-500/20 bg-gradient-to-br from-yellow-950/10 to-transparent flex flex-col justify-between h-52 relative overflow-hidden group hover:border-yellow-500/40 transition duration-300">
                          <div>
                            <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest block mb-1">CAREER sixes RECORD</span>
                            <h4 className="text-white font-black uppercase text-sm leading-tight group-hover:text-yellow-400 transition">{historicalRecords.mostCareerSixes.title}</h4>
                            <strong className="text-xl font-black font-mono text-yellow-400 block mt-3 leading-none">{historicalRecords.mostCareerSixes.value}</strong>
                            <p className="text-[10px] text-gray-500 mt-2 font-bold uppercase">All-Time maximum sixes record</p>
                          </div>
                          <div className="flex items-center justify-between border-t border-white/5 pt-3.5 mt-3">
                            <div 
                              onClick={() => router.push(`/players/${historicalRecords.mostCareerSixes.holderId}`)}
                              className="flex items-center space-x-2.5 cursor-pointer"
                            >
                              <div className="w-7 h-7 rounded bg-gray-900 border border-white/10 overflow-hidden flex items-center justify-center font-bold text-white text-xs">
                                {historicalRecords.mostCareerSixes.holderAvatar ? (
                                  <img src={historicalRecords.mostCareerSixes.holderAvatar} className="w-full h-full object-cover" />
                                ) : (
                                  historicalRecords.mostCareerSixes.holderName.charAt(0)
                                )}
                              </div>
                              <span className="text-xs font-bold text-gray-300 hover:text-[#66fcf1] transition">{historicalRecords.mostCareerSixes.holderName}</span>
                            </div>
                            <span className="text-[9px] font-mono text-gray-500 font-bold">ACTIVE</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-card p-12 text-center border-dashed border-white/10">
                      <Award className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-xs italic">Historical records are currently unavailable</p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </main>
      </div>
    </div>
  );
}
