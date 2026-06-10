'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
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
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  AreaChart,
  Area,
  Legend
} from 'recharts';
import {
  User,
  Shield,
  Activity,
  Trophy,
  Award,
  Edit2,
  Save,
  X,
  FileText,
  History,
  Calendar,
  Zap,
  Star,
  RefreshCw,
  Camera,
  Lock,
  CheckCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  AwardIcon,
  ShieldAlert
} from 'lucide-react';

interface PlayerStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    ballsFaced: number;
    highestScore: number;
    average: number;
    strikeRate: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    ducks: number;
  };
  bowling: {
    matches: number;
    wickets: number;
    ballsBowled: number;
    runsConceded: number;
    bestBowling: string;
    economy: number;
    maidens: number;
    average: number;
    strikeRate: number;
    fiveWickets: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

interface BadgeProgressDetail {
  earned: boolean;
  current: number;
  target: number;
  percentage: number;
}

interface Player {
  _id: string;
  name: string;
  avatar: string;
  role: 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket-Keeper';
  battingStyle: 'Right-hand bat' | 'Left-hand bat';
  bowlingStyle: string;
  bio: string;
  stats: PlayerStats;
  catches: number;
  mvpAwards: number;
  teamHistory: { teamName: string; year: string }[];
  currentTeam?: {
    _id: string;
    name: string;
    logo?: string;
  };
  matchHistory: {
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
  }[];
  achievements: { title: string; date: string; description: string }[];
  isDetailedStatsAuthorized?: boolean;
  badgeProgress?: {
    mvp: BadgeProgressDetail;
    topPerformer: BadgeProgressDetail;
    tournamentWinner: BadgeProgressDetail;
    winningStreak: BadgeProgressDetail;
    teamLegend: BadgeProgressDetail;
  };
}

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'graphs' | 'matches' | 'achievements'>('overview');

  // Match history filters
  const [filterTournament, setFilterTournament] = useState('');
  const [filterOpponent, setFilterOpponent] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Edit form states
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'Batsman' as const,
    battingStyle: 'Right-hand bat' as const,
    bowlingStyle: '',
    bio: '',
    avatar: '',
  });

  const fetchPlayer = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/players/${playerId}`);
      if (response.data.success) {
        setPlayer(response.data.data);
        setEditForm({
          name: response.data.data.name,
          role: response.data.data.role,
          battingStyle: response.data.data.battingStyle,
          bowlingStyle: response.data.data.bowlingStyle || 'None',
          bio: response.data.data.bio || '',
          avatar: response.data.data.avatar || '',
        });

        // Try fetching detailed analytics data
        try {
          const analyticsResponse = await api.get(`/analytics/player/${playerId}`);
          if (analyticsResponse.data.success) {
            setAnalyticsData(analyticsResponse.data.data);
          }
        } catch (analyticsErr) {
          console.error('Error fetching player analytics details:', analyticsErr);
        }
      }
    } catch (err) {
      console.error('Error fetching player:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (playerId) fetchPlayer();
  }, [playerId]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const response = await api.put(`/players/${playerId}`, editForm);
      if (response.data.success) {
        setPlayer(response.data.data);
        setIsEditing(false);
        alert('Player profile updated successfully!');
        fetchPlayer();
      }
    } catch (err) {
      console.error('Error updating player:', err);
      alert('Failed to save profile changes');
    } finally {
      setUpdating(false);
    }
  };

  const mockAvatarUpload = () => {
    const randomAvatars = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'
    ];
    const picked = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
    setEditForm({ ...editForm, avatar: picked });
  };

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
        <div className="text-center p-8 glass-card max-w-sm">
          <Shield className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Player Not Found</h2>
          <button onClick={() => router.push('/players')} className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] font-bold rounded">
            Back to Players
          </button>
        </div>
      </div>
    );
  }

  const { stats, catches, mvpAwards, teamHistory, matchHistory, achievements } = player;

  // Let scorers or admins edit details
  const canEdit = isAuthenticated && user && (user.role === 'admin' || user.role === 'organizer');

  // Authorization access checker
  const isAuthorized = player.isDetailedStatsAuthorized !== false;

  // Radar skills comparison
  const skillProfile = [
    { subject: 'Runs', A: (stats?.batting?.runs || 0) > 1000 ? 100 : ((stats?.batting?.runs || 0) / 10), fullMark: 100 },
    { subject: 'Wickets', A: (stats?.bowling?.wickets || 0) > 50 ? 100 : ((stats?.bowling?.wickets || 0) * 2), fullMark: 100 },
    { subject: 'Catches', A: (stats?.fielding?.catches || catches || 0) > 20 ? 100 : ((stats?.fielding?.catches || catches || 0) * 5), fullMark: 100 },
    { subject: 'MVPs', A: mvpAwards > 5 ? 100 : (mvpAwards * 20), fullMark: 100 },
    { subject: 'Strike Rate', A: Math.min(100, (stats?.batting?.strikeRate || 0) / 1.5), fullMark: 100 },
  ];

  // Match History charts
  const chartData = matchHistory && matchHistory.length > 0
    ? [...matchHistory]
        .reverse()
        .map((m, index) => ({
          match: `Game ${index + 1}`,
          runs: m.runs || 0,
          wickets: m.wickets || 0
        }))
    : [];

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Top Banner Cover Card */}
          <div className="glass-card mb-8 border-[#66fcf1]/10 overflow-hidden relative">
            <div className="h-44 md:h-64 w-full relative overflow-hidden">
              <img 
                src="https://images.unsplash.com/photo-1540747737956-37872f747ee7?auto=format&fit=crop&q=80&w=1200" 
                alt="Stadium Lights Cover" 
                className="w-full h-full object-cover brightness-[0.2]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] to-transparent"></div>
              
              {canEdit && (
                <button
                  onClick={handleEditToggle}
                  className="absolute top-4 right-4 py-2 px-4 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-black uppercase rounded-xl shadow-lg transition duration-200 flex items-center space-x-1.5"
                >
                  {isEditing ? (
                    <>
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </>
                  ) : (
                    <>
                      <Edit2 className="w-4 h-4" />
                      <span>Edit Profile</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="p-6 md:p-8 -mt-16 md:-mt-24 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-3xl md:text-5xl border-4 border-[#0b0c10] overflow-hidden shadow-2xl relative group">
                  {player.avatar || editForm.avatar ? (
                    <img src={editForm.avatar || player.avatar} alt={player.name} className="w-full h-full object-cover" />
                  ) : (
                    player.name.charAt(0).toUpperCase()
                  )}
                  {isEditing && (
                    <button
                      onClick={mockAvatarUpload}
                      className="absolute inset-0 bg-[#0b0c10]/60 flex items-center justify-center text-[#66fcf1] opacity-0 group-hover:opacity-100 transition"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <div className="space-y-1 md:pb-2">
                  <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider">{player.name}</h1>
                  
                  {/* Current Team Info with Logo & Link */}
                  {player.currentTeam ? (
                    <div 
                      onClick={() => router.push(`/teams/${player.currentTeam?._id}`)}
                      className="flex items-center justify-center md:justify-start space-x-2 cursor-pointer group mt-1"
                    >
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Team:</span>
                      <div className="w-5 h-5 rounded bg-gray-800 flex items-center justify-center overflow-hidden border border-white/10 group-hover:border-[#66fcf1]/30 transition">
                        {player.currentTeam.logo ? (
                          <img src={player.currentTeam.logo} alt={player.currentTeam.name} className="w-full h-full object-cover" />
                        ) : (
                          player.currentTeam.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <span className="text-xs font-black uppercase text-white group-hover:text-[#66fcf1] transition">{player.currentTeam.name}</span>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Free Agent</p>
                  )}

                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5 mt-2">
                    <span className="bg-[#66fcf1]/10 border border-[#66fcf1]/25 text-[#66fcf1] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {player.role}
                    </span>
                    <span className="bg-gray-800 border border-white/5 text-gray-300 text-[9px] font-bold px-3 py-1 rounded-full uppercase">
                      {player.battingStyle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Jersey style MVP badge */}
              <div className="bg-[#1f2833]/50 backdrop-blur-md border border-yellow-500/25 px-5 py-3 rounded-2xl text-center shadow-xl self-center md:self-auto flex items-center space-x-3">
                <Star className="w-8 h-8 text-yellow-400 fill-current animate-pulse" />
                <div className="text-left">
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-wider block">MVP AWARDS</span>
                  <span className="font-mono text-xl md:text-2xl font-black text-yellow-400 block -mt-0.5">{mvpAwards || 0}</span>
                </div>
              </div>
            </div>

            {/* Editable Profile Overlay Form */}
            {isEditing && (
              <form onSubmit={handleFormSubmit} className="p-6 border-t border-[#66fcf1]/15 grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Player Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editForm.name}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Player Biography</label>
                    <textarea
                      name="bio"
                      rows={3}
                      value={editForm.bio}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]"
                    />
                  </div>
                </div>
                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Position Role</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white outline-none"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket-Keeper</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Batting Hand</label>
                      <select
                        name="battingStyle"
                        value={editForm.battingStyle}
                        onChange={handleInputChange}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-xs text-white"
                      >
                        <option value="Right-hand bat">Right-hand bat</option>
                        <option value="Left-hand bat">Left-hand bat</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Bowling Style</label>
                      <input
                        type="text"
                        name="bowlingStyle"
                        value={editForm.bowlingStyle}
                        onChange={handleInputChange}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-xs text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold rounded-lg transition text-xs uppercase"
                  >
                    {updating ? 'SAVING CHANGES...' : 'SAVE ATHLETE CONFIGURATION'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* 10 Career KPI Statistics Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-8">
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Matches</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {stats?.batting?.matches || stats?.bowling?.matches || 0}
              </span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Innings</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{stats?.batting?.innings || 0}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Runs</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{stats?.batting?.runs || 0}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Batting Avg</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {stats?.batting?.average ? stats.batting.average.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Strike Rate</span>
              <span className="text-xl font-bold font-mono text-[#66fcf1] mt-1 block">
                {stats?.batting?.strikeRate ? stats.batting.strikeRate.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">High Score</span>
              <span className="text-xl font-bold font-mono text-amber-400 mt-1 block">{stats?.batting?.highestScore || 0}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Wickets</span>
              <span className="text-xl font-bold font-mono text-pink-400 mt-1 block">{stats?.bowling?.wickets || 0}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Bowling Avg</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {stats?.bowling?.average ? stats.bowling.average.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Economy</span>
              <span className="text-xl font-bold font-mono text-[#66fcf1] mt-1 block">
                {stats?.bowling?.economy ? stats.bowling.economy.toFixed(2) : '0.00'}
              </span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Catches</span>
              <span className="text-xl font-bold font-mono text-yellow-400 mt-1 block">
                {stats?.fielding?.catches || catches || 0}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'overview' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Career Overview
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'graphs' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Performance Trends
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'matches' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Match History
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'achievements' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Badges & Milestones ({achievements?.length || 0})
            </button>
          </div>

          {/* Tab Views */}
          <div className="space-y-8">
            
            {/* TAB 1: CAREER OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {!isAuthorized && (
                  <div className="bg-[#1f2833]/30 border border-yellow-500/20 rounded-2xl p-4 flex items-center space-x-3 shadow-xl">
                    <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-xs text-gray-400">
                      You are viewing public career statistics. Detailed match-by-match analytics and performance curves are restricted to the player's <strong className="text-white">Team Captain</strong> or a CricVerse <strong className="text-white">Admin</strong>.
                    </p>
                  </div>
                )}

                {/* Form & Consistency Highlights (Visible to authorized roles) */}
                {isAuthorized && analyticsData && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="glass-card p-5 border-white/5 flex flex-col justify-between">
                      <div className="flex items-center space-x-2 text-[#66fcf1]">
                        <Activity className="w-4 h-4" />
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider">Form & Consistency</h4>
                      </div>
                      <div className="flex items-center justify-around my-2">
                        <div className="text-center">
                          <span className="text-[9px] text-gray-500 block uppercase font-bold">Streak (30+/2w)</span>
                          <strong className="text-lg font-bold font-mono text-white mt-0.5 block">{analyticsData.longestStreak || 0} Matches</strong>
                        </div>
                        <div className="text-center">
                          <span className="text-[9px] text-gray-500 block uppercase font-bold">Recent Form Rating</span>
                          <strong className="text-lg font-bold font-mono text-[#66fcf1] mt-0.5 block">{analyticsData.recentFormRating || 0}%</strong>
                        </div>
                      </div>
                    </div>

                    <div className="glass-card p-5 border-white/5 space-y-3 md:col-span-2">
                      <div className="flex items-center space-x-2 text-yellow-500 pb-1.5 border-b border-white/5">
                        <Award className="w-4 h-4" />
                        <h4 className="text-[10px] font-extrabold uppercase tracking-wider">Match Records Highlights</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-[9px] text-gray-500 block uppercase font-bold">Best Match Scorecard</span>
                          <strong className="text-emerald-400 block text-sm font-black uppercase mt-0.5">
                            {analyticsData.bestMatch ? `${analyticsData.bestMatch.runs} runs, ${analyticsData.bestMatch.wickets} wickets` : 'N/A'}
                          </strong>
                          <span className="text-[9px] text-gray-400 block truncate mt-0.5">{analyticsData.bestMatch?.title}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 block uppercase font-bold">Worst Match Scorecard</span>
                          <strong className="text-rose-500 block text-sm font-black uppercase mt-0.5">
                            {analyticsData.worstMatch ? `${analyticsData.worstMatch.runs} runs, ${analyticsData.worstMatch.wickets} wickets` : 'N/A'}
                          </strong>
                          <span className="text-[9px] text-gray-400 block truncate mt-0.5">{analyticsData.worstMatch?.title}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Batting Detailed Stats */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 border-b border-white/5 pb-2 font-mono">
                    Batting Career Record Sheet
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-2.5 px-2 text-center">Matches</th>
                          <th className="py-2.5 px-2 text-center">Innings</th>
                          <th className="py-2.5 px-2 text-center">Runs</th>
                          <th className="py-2.5 px-2 text-center">Balls Faced</th>
                          <th className="py-2.5 px-2 text-center">High Score</th>
                          <th className="py-2.5 px-2 text-center">Average</th>
                          <th className="py-2.5 px-2 text-center">Strike Rate</th>
                          <th className="py-2.5 px-2 text-center">4s</th>
                          <th className="py-2.5 px-2 text-center">6s</th>
                          <th className="py-2.5 px-2 text-center">50s</th>
                          <th className="py-2.5 px-2 text-center">100s</th>
                          <th className="py-2.5 px-2 text-center">Ducks</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5 font-mono text-center text-white">
                          <td className="py-3 px-2 font-bold">{stats?.batting?.matches || 0}</td>
                          <td className="py-3 px-2">{stats?.batting?.innings || 0}</td>
                          <td className="py-3 px-2 font-bold text-emerald-400">{stats?.batting?.runs || 0}</td>
                          <td className="py-3 px-2">{stats?.batting?.ballsFaced || 0}</td>
                          <td className="py-3 px-2 text-amber-400 font-bold">{stats?.batting?.highestScore || 0}</td>
                          <td className="py-3 px-2">{stats?.batting?.average ? stats.batting.average.toFixed(2) : '0.00'}</td>
                          <td className="py-3 px-2 font-bold text-[#66fcf1]">{stats?.batting?.strikeRate ? stats.batting.strikeRate.toFixed(2) : '0.00'}</td>
                          <td className="py-3 px-2">{stats?.batting?.fours || 0}</td>
                          <td className="py-3 px-2 text-cyan-400">{stats?.batting?.sixes || 0}</td>
                          <td className="py-3 px-2 text-purple-400">{stats?.batting?.fifties || 0}</td>
                          <td className="py-3 px-2 text-yellow-400 font-bold">{stats?.batting?.hundreds || 0}</td>
                          <td className="py-3 px-2 text-red-500">{stats?.batting?.ducks || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Bowling Detailed Stats */}
                <div className="glass-card p-6 border-white/5">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 border-b border-white/5 pb-2 font-mono">
                    Bowling Career Record Sheet
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-400">
                      <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                        <tr>
                          <th className="py-2.5 px-2 text-center">Matches</th>
                          <th className="py-2.5 px-2 text-center">Overs Bowled</th>
                          <th className="py-2.5 px-2 text-center">Runs Conceded</th>
                          <th className="py-2.5 px-2 text-center">Wickets</th>
                          <th className="py-2.5 px-2 text-center">Best Bowling</th>
                          <th className="py-2.5 px-2 text-center">Economy</th>
                          <th className="py-2.5 px-2 text-center">Average</th>
                          <th className="py-2.5 px-2 text-center">Maidens</th>
                          <th className="py-2.5 px-2 text-center">5w Innings</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-white/5 font-mono text-center text-white">
                          <td className="py-3 px-2 font-bold">{stats?.bowling?.matches || 0}</td>
                          <td className="py-3 px-2 font-bold">
                            {stats?.bowling?.ballsBowled ? `${Math.floor(stats.bowling.ballsBowled / 6)}.${stats.bowling.ballsBowled % 6}` : '0.0'}
                          </td>
                          <td className="py-3 px-2 text-rose-500">{stats?.bowling?.runsConceded || 0}</td>
                          <td className="py-3 px-2 font-bold text-pink-400">{stats?.bowling?.wickets || 0}</td>
                          <td className="py-3 px-2 text-amber-400 font-bold">{stats?.bowling?.bestBowling || '0/0'}</td>
                          <td className="py-3 px-2 text-[#66fcf1]">{stats?.bowling?.economy ? stats.bowling.economy.toFixed(2) : '0.00'}</td>
                          <td className="py-3 px-2">{stats?.bowling?.average ? stats.bowling.average.toFixed(2) : '0.00'}</td>
                          <td className="py-3 px-2">{stats?.bowling?.maidens || 0}</td>
                          <td className="py-3 px-2 font-bold">{stats?.bowling?.fiveWickets || 0}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Team History Roster Timeline */}
                <div className="glass-card p-6 border-white/5 max-w-xl">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 border-b border-white/5 pb-2 flex items-center space-x-1.5">
                    <History className="w-4 h-4 text-gray-500" />
                    <span>Career Team History Timeline</span>
                  </h3>
                  <div className="space-y-4">
                    {teamHistory && teamHistory.length > 0 ? (
                      teamHistory.map((item, idx) => (
                        <div key={idx} className="flex items-center space-x-3.5 text-xs text-gray-300">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <span className="font-mono text-gray-500">{item.year}</span>
                          <span className="text-[#66fcf1] font-bold uppercase">{item.teamName}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs italic">No previous teams registered.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: PERFORMANCE TRENDS (GRAPHS) */}
            {activeTab === 'graphs' && (() => {
              if (!isAuthorized) {
                return (
                  <div className="glass-card p-8 border-red-500/20 text-center flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <Lock className="w-14 h-14 text-red-500 mb-4 animate-bounce" />
                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Performance Trends Locked</h3>
                    <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
                      Wagon wheels, strike rate logs, run/wicket trends, and radar skill charts are visible only to the Team Captain, Team Owner, or System Administrators.
                    </p>
                    <span className="bg-red-950/20 border border-red-500/30 text-red-400 text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Access Denied
                    </span>
                  </div>
                );
              }

              if (chartData.length === 0) {
                return (
                  <div className="glass-card p-12 text-center border-dashed border-[#66fcf1]/20 max-w-lg mx-auto space-y-4">
                    <Activity className="w-16 h-16 text-gray-600 mx-auto" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">No Performance Graphs Compiled</h3>
                    <p className="text-xs text-gray-400">
                      This athlete has not played any completed matches yet. Graphs and progression analysis will populate once match stats are recorded.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Radar Skill Index Profile */}
                    <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col items-center">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Athlete Skill Index</h3>
                      <div className="h-64 w-full max-w-sm">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="85%" data={skillProfile}>
                            <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
                            <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                            <PolarRadiusAxis stroke="rgba(255,255,255,0.08)" fontSize={8} />
                            <Radar name={player.name} dataKey="A" stroke="#66fcf1" fill="#66fcf1" fillOpacity={0.25} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Line Chart: Runs scoring trends */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Match Runs Scoring Trend</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={[...matchHistory].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#1f2833', border: '1px solid rgba(102,252,241,0.1)', color: '#fff' }} />
                            <Line type="monotone" dataKey="runs" name="Runs" stroke="#39ff14" strokeWidth={3} dot={{ fill: '#39ff14', r: 4 }} activeDot={{ r: 6 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Line Chart: Strike Rate Trend */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Strike Rate Progression Curve</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={[...matchHistory].reverse().map((m, idx) => ({
                              game: `G ${idx + 1}`,
                              strikeRate: m.balls > 0 ? Math.round((m.runs / m.balls) * 100) : 0
                            }))}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                            <XAxis dataKey="game" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#1f2833', border: '1px solid rgba(102,252,241,0.1)', color: '#fff' }} />
                            <Line type="monotone" dataKey="strikeRate" name="Strike Rate" stroke="#66fcf1" strokeWidth={3} dot={{ fill: '#66fcf1', r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Bar Chart: Wickets taken */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-pink-500 mb-6">Wickets Taken Progression</h3>
                      <div className="h-64 w-full">
                        {matchHistory.some(m => m.wickets > 0 || m.overs > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[...matchHistory].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                              <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <Tooltip contentStyle={{ background: '#1f2833', border: '1px solid rgba(102,252,241,0.1)', color: '#fff' }} />
                              <Bar dataKey="wickets" name="Wickets" fill="#ff007f" radius={[4, 4, 0, 0]} maxBarSize={15} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-gray-500 text-xs py-24 text-center italic">No bowling records available</p>
                        )}
                      </div>
                    </div>

                    {/* Area Chart: Cumulative Career Runs */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-emerald-400 mb-6">Cumulative Career Runs Curve</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={(() => {
                              let total = 0;
                              return [...matchHistory].reverse().map((m, idx) => {
                                total += m.runs || 0;
                                return { game: `G ${idx + 1}`, cumulativeRuns: total };
                              });
                            })()}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                            <XAxis dataKey="game" stroke="rgba(255,255,255,0.4)" fontSize={9} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#1f2833', border: '1px solid rgba(102,252,241,0.1)', color: '#fff' }} />
                            <Area type="monotone" dataKey="cumulativeRuns" name="Cumulative Runs" stroke="#39ff14" fill="#39ff14" fillOpacity={0.08} strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Grouped Bar Chart: Runs vs Balls */}
                    <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-amber-500 mb-6">Match Runs vs Balls Faced</h3>
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={[...matchHistory].reverse()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                            <XAxis dataKey="date" stroke="rgba(255,255,255,0.4)" fontSize={9} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                            <Tooltip contentStyle={{ background: '#1f2833', border: '1px solid rgba(102,252,241,0.1)', color: '#fff' }} />
                            <Legend wrapperStyle={{ fontSize: 9 }} />
                            <Bar dataKey="runs" name="Runs" fill="#39ff14" radius={[3, 3, 0, 0]} maxBarSize={12} />
                            <Bar dataKey="balls" name="Balls" fill="#2563eb" radius={[3, 3, 0, 0]} maxBarSize={12} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* TAB 3: MATCH HISTORY TABLE */}
            {activeTab === 'matches' && (() => {
              if (!isAuthorized) {
                return (
                  <div className="glass-card p-8 border-red-500/20 text-center flex flex-col items-center justify-center min-h-[350px] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                    <Lock className="w-14 h-14 text-red-500 mb-4 animate-bounce" />
                    <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Detailed Match Log Locked</h3>
                    <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
                      Historical match rosters, tournament opponent logs, scores, and match MVP awards are private and accessible only to authorized captains or administrators.
                    </p>
                    <span className="bg-red-950/20 border border-red-500/30 text-red-400 text-[9px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
                      Access Denied
                    </span>
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Filters Block */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-[#1f2833]/20 border border-white/5 rounded-2xl">
                    <div>
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Tournament</label>
                      <select
                        value={filterTournament}
                        onChange={(e) => setFilterTournament(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                      >
                        <option value="">All Tournaments</option>
                        {Array.from(new Set((matchHistory || []).map(m => m.tournamentName))).filter(Boolean).map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Opponent Team</label>
                      <select
                        value={filterOpponent}
                        onChange={(e) => setFilterOpponent(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none"
                      >
                        <option value="">All Opponents</option>
                        {Array.from(new Set((matchHistory || []).map(m => m.opponentName))).filter(Boolean).map(o => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">Start Date</label>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block mb-1">End Date</label>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-xl py-1.5 px-3 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Logs Table */}
                  <div className="glass-card p-6 border-white/5">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-400">
                        <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                          <tr>
                            <th className="py-3 px-3">Date</th>
                            <th className="py-3 px-3">Tournament</th>
                            <th className="py-3 px-3">Opponent</th>
                            <th className="py-3 px-3 text-center">Runs</th>
                            <th className="py-3 px-3 text-center">Balls</th>
                            <th className="py-3 px-3 text-center">Wickets</th>
                            <th className="py-3 px-3">Result</th>
                            <th className="py-3 px-3 text-right">Awards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const filtered = (matchHistory || []).filter(m => {
                              const matchDate = new Date(m.date);
                              const matchesTournament = filterTournament ? m.tournamentName === filterTournament : true;
                              const matchesOpponent = filterOpponent ? m.opponentName === filterOpponent : true;
                              const matchesStart = filterStartDate ? matchDate >= new Date(filterStartDate) : true;
                              const matchesEnd = filterEndDate ? matchDate <= new Date(filterEndDate + 'T23:59:59') : true;
                              return matchesTournament && matchesOpponent && matchesStart && matchesEnd;
                            });

                            if (filtered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="py-8 text-center text-gray-600 italic">No matches matched the filter criteria</td>
                                </tr>
                              );
                            }

                            return filtered.map((match, i) => (
                              <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3.5 px-3 font-mono text-gray-500">{new Date(match.date).toLocaleDateString()}</td>
                                <td className="py-3.5 px-3">{match.tournamentName}</td>
                                <td className="py-3.5 px-3 font-bold text-white uppercase">{match.opponentName}</td>
                                <td className="py-3.5 px-3 font-mono font-bold text-emerald-400 text-center">{match.runs}</td>
                                <td className="py-3.5 px-3 font-mono text-center">{match.balls}</td>
                                <td className="py-3.5 px-3 font-mono text-pink-400 text-center font-bold">{match.wickets}</td>
                                <td className="py-3.5 px-3 leading-normal">{match.resultText}</td>
                                <td className="py-3.5 px-3 text-right">
                                  {match.mvpStatus ? (
                                    <span className="inline-flex items-center space-x-1 bg-yellow-500/10 text-yellow-400 text-[8px] font-extrabold uppercase py-0.5 px-2 rounded-full border border-yellow-500/20 shadow-[0_0_12px_rgba(234,179,8,0.1)]">
                                      <Star className="w-2.5 h-2.5 fill-current" />
                                      <span>MVP</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-600">-</span>
                                  )}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* TAB 4: BADGES & MILESTONES */}
            {activeTab === 'achievements' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 text-[#66fcf1]">
                  <Trophy className="w-5 h-5" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Athlete Milestone Badges</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(() => {
                    const defaultBadges = [
                      {
                        key: 'mvp',
                        title: 'MVP',
                        description: 'Awarded for winning the Most Valuable Player accolade in a match.',
                        icon: Star,
                        color: 'text-amber-400',
                        border: 'border-amber-400/20'
                      },
                      {
                        key: 'topPerformer',
                        title: 'Top Performer',
                        description: 'Scored 50+ runs or took 3+ wickets in a single match.',
                        icon: Zap,
                        color: 'text-cyan-400',
                        border: 'border-[#66fcf1]/20'
                      },
                      {
                        key: 'tournamentWinner',
                        title: 'Tournament Winner',
                        description: 'Member of a tournament championship winning squad.',
                        icon: Trophy,
                        color: 'text-yellow-500',
                        border: 'border-yellow-500/20'
                      },
                      {
                        key: 'winningStreak',
                        title: 'Winning Streak',
                        description: 'Awarded for being on a 3+ match winning streak.',
                        icon: TrendingUp,
                        color: 'text-orange-500',
                        border: 'border-orange-500/20'
                      },
                      {
                        key: 'teamLegend',
                        title: 'Team Legend',
                        description: 'Played 5+ matches for a single team or served as Team Captain.',
                        icon: Shield,
                        color: 'text-purple-400',
                        border: 'border-purple-400/20'
                      }
                    ];

                    const progress = player.badgeProgress || {
                      mvp: { earned: false, current: 0, target: 1, percentage: 0 },
                      topPerformer: { earned: false, current: 0, target: 1, percentage: 0 },
                      tournamentWinner: { earned: false, current: 0, target: 1, percentage: 0 },
                      winningStreak: { earned: false, current: 0, target: 3, percentage: 0 },
                      teamLegend: { earned: false, current: 0, target: 5, percentage: 0 }
                    };

                    return defaultBadges.map((badge) => {
                      const prog = progress[badge.key as keyof typeof progress] || { earned: false, current: 0, target: 100, percentage: 0 };
                      const IconComponent = badge.icon;
                      const achievementRecord = (achievements || []).find(a => a.title === badge.title);

                      return (
                        <div
                          key={badge.key}
                          className={`glass-card p-5 border ${badge.border} text-center relative overflow-hidden flex flex-col justify-between h-56 transition hover:border-[#66fcf1]/25`}
                        >
                          {prog.earned ? (
                            <div className="absolute top-3 right-3 text-emerald-400">
                              <CheckCircle className="w-5 h-5 fill-emerald-500/10" />
                            </div>
                          ) : (
                            <div className="absolute top-3 right-3 text-gray-600">
                              <Lock className="w-4 h-4" />
                            </div>
                          )}

                          <div className="space-y-2">
                            <IconComponent className={`w-10 h-10 ${badge.color} mx-auto mb-2 ${prog.earned ? 'animate-pulse' : 'opacity-30'}`} />
                            <h4 className="font-bold text-white text-sm uppercase tracking-wide">{badge.title}</h4>
                            <p className="text-gray-500 text-[10px] leading-relaxed px-2">{badge.description}</p>
                          </div>

                          <div className="w-full mt-4 space-y-1.5">
                            {prog.earned ? (
                              <span className="text-[10px] text-emerald-400 font-bold block uppercase tracking-wider">
                                Earned {achievementRecord ? new Date(achievementRecord.date).toLocaleDateString() : 'on Seeding'}
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <div className="flex justify-between items-center text-[9px] font-mono text-gray-500 font-bold">
                                  <span>Progress</span>
                                  <span>{prog.current} / {prog.target}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-900 rounded-full overflow-hidden flex">
                                  <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style={{ width: `${prog.percentage}%` }}></div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
