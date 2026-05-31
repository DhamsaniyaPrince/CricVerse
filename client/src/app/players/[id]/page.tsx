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
  Radar
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
  Camera
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
  matchHistory: { matchId: string; runs: number; balls: number; wickets: number; overs: number; date: string }[];
  achievements: { title: string; date: string; description: string }[];
}

// Fallback chart data if player match history is empty
const mockMatchPerformance = [
  { match: 'Match 1', runs: 34, wickets: 1 },
  { match: 'Match 2', runs: 58, wickets: 0 },
  { match: 'Match 3', runs: 12, wickets: 2 },
  { match: 'Match 4', runs: 90, wickets: 0 },
  { match: 'Match 5', runs: 42, wickets: 1 }
];

export default function PlayerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'matches' | 'achievements' | 'graphs'>('overview');

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
      }
    } catch (err) {
      console.error('Error updating player:', err);
      alert('Failed to save profile changes');
    } finally {
      setUpdating(false);
    }
  };

  const mockAvatarUpload = () => {
    // Generate a premium random sports avatar
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

  // Prepare radar profile charts
  const skillProfile = [
    { subject: 'Runs', A: (stats?.batting?.runs || 0) > 5000 ? 100 : ((stats?.batting?.runs || 0) / 50), fullMark: 100 },
    { subject: 'Wickets', A: (stats?.bowling?.wickets || 0) > 150 ? 100 : ((stats?.bowling?.wickets || 0) / 1.5), fullMark: 100 },
    { subject: 'Catches', A: (stats?.fielding?.catches || catches || 0) > 50 ? 100 : ((stats?.fielding?.catches || catches || 0) * 2), fullMark: 100 },
    { subject: 'MVPs', A: mvpAwards > 10 ? 100 : (mvpAwards * 10), fullMark: 100 },
    { subject: 'Strike Rate', A: Math.min(100, (stats?.batting?.strikeRate || 0) / 1.5), fullMark: 100 },
  ];

  const chartData = matchHistory && matchHistory.length > 0
    ? [...matchHistory]
        .reverse()
        .map((m, index) => ({
          match: `Game ${index + 1}`,
          runs: m.runs || 0,
          wickets: m.wickets || 0
        }))
    : mockMatchPerformance;

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Top profile bio card */}
          <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/10 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center space-x-0 md:space-x-6 text-center md:text-left">
                {/* Avatar upload/view */}
                <div className="relative group mb-4 md:mb-0">
                  <div className="w-24 h-24 rounded-3xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-4xl border-2 border-[#66fcf1]/30 overflow-hidden shadow-lg shadow-cyan-500/10">
                    {player.avatar || editForm.avatar ? (
                      <img src={editForm.avatar || player.avatar} alt={player.name} className="w-full h-full object-cover" />
                    ) : (
                      player.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isEditing && (
                    <button
                      onClick={mockAvatarUpload}
                      className="absolute inset-0 bg-[#0b0c10]/60 rounded-3xl flex items-center justify-center text-[#66fcf1] opacity-0 group-hover:opacity-100 transition duration-200"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <h1 className="text-3xl font-black text-white uppercase tracking-wider">{player.name}</h1>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                    <span className="bg-[#66fcf1]/10 border border-[#66fcf1]/20 text-[#66fcf1] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                      {player.role}
                    </span>
                    <span className="bg-gray-800 border border-white/5 text-gray-300 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                      {player.battingStyle}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm max-w-lg mt-2 italic">
                    "{player.bio || 'This professional cricketer is ready for the CricVerse tournament games.'}"
                  </p>
                </div>
              </div>

              {/* Edit toggle */}
              {canEdit && (
                <button
                  onClick={handleEditToggle}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition duration-200"
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

            {/* Editable Profile Form Overlay */}
            {isEditing && (
              <form onSubmit={handleFormSubmit} className="mt-8 border-t border-[#66fcf1]/15 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Player Name</label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={editForm.name}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bio Description</label>
                    <textarea
                      name="bio"
                      rows={3}
                      value={editForm.bio}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Player Role</label>
                    <select
                      name="role"
                      value={editForm.role}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket-Keeper</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Batting Style</label>
                      <select
                        name="battingStyle"
                        value={editForm.battingStyle}
                        onChange={handleInputChange}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-2 text-xs text-white"
                      >
                        <option value="Right-hand bat">Right-hand bat</option>
                        <option value="Left-hand bat">Left-hand bat</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Bowling Style</label>
                      <input
                        type="text"
                        name="bowlingStyle"
                        value={editForm.bowlingStyle}
                        onChange={handleInputChange}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={updating}
                    className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold rounded-lg transition"
                  >
                    {updating ? 'SAVING CHANGES...' : 'SAVE PROFILE DETAILS'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Stats Cards Section */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-4 border-[#66fcf1]/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Career Matches</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">
                {stats.batting.matches || stats.bowling.matches || 0}
              </span>
            </div>
            <div className="glass-card p-4 border-[#66fcf1]/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Total Runs</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                {stats.batting.runs}
              </span>
            </div>
            <div className="glass-card p-4 border-[#66fcf1]/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Wickets</span>
              <span className="text-xl font-bold font-mono text-pink-400 mt-1 block">
                {stats.bowling.wickets}
              </span>
            </div>
            <div className="glass-card p-4 border-[#66fcf1]/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">MVP Awards</span>
              <span className="text-xl font-bold font-mono text-[#66fcf1] mt-1 block">
                {mvpAwards}
              </span>
            </div>
          </div>

          {/* Profile Navigation Tabs */}
          <div className="flex flex-wrap border-b border-[#66fcf1]/15 mb-8">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'overview'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Career Overview
            </button>
            <button
              onClick={() => setActiveTab('graphs')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'graphs'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Performance Graphs
            </button>
            <button
              onClick={() => setActiveTab('matches')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'matches'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Match History
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'achievements'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Badges/Achievements ({achievements?.length || 0})
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Batting Career Stats Table */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <div className="flex items-center space-x-2 mb-4 border-b border-[#66fcf1]/10 pb-3">
                  <Activity className="w-5 h-5 text-[#66fcf1]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white font-mono">Batting Career statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                      <tr>
                        <th className="py-3 px-3 text-center">Matches</th>
                        <th className="py-3 px-3 text-center">Innings</th>
                        <th className="py-3 px-3 text-center">Runs</th>
                        <th className="py-3 px-3 text-center">Highest Score</th>
                        <th className="py-3 px-3 text-center">Average</th>
                        <th className="py-3 px-3 text-center">Strike Rate</th>
                        <th className="py-3 px-3 text-center">Fours (4s)</th>
                        <th className="py-3 px-3 text-center">Sixes (6s)</th>
                        <th className="py-3 px-3 text-center">Fifties (50s)</th>
                        <th className="py-3 px-3 text-center">Hundreds (100s)</th>
                        <th className="py-3 px-3 text-center">Ducks</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-4 px-3 font-mono font-bold text-white text-center">{stats?.batting?.matches || 0}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.batting?.innings || 0}</td>
                        <td className="py-4 px-3 font-mono font-bold text-emerald-400 text-center">{stats?.batting?.runs || 0}</td>
                        <td className="py-4 px-3 font-mono text-amber-400 text-center">{stats?.batting?.highestScore || 0}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.batting?.average ? stats.batting.average.toFixed(2) : '0.00'}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.batting?.strikeRate ? stats.batting.strikeRate.toFixed(2) : '0.00'}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.batting?.fours || 0}</td>
                        <td className="py-4 px-3 font-mono text-cyan-400 text-center">{stats?.batting?.sixes || 0}</td>
                        <td className="py-4 px-3 font-mono text-purple-400 text-center">{stats?.batting?.fifties || 0}</td>
                        <td className="py-4 px-3 font-mono text-yellow-400 text-center">{stats?.batting?.hundreds || 0}</td>
                        <td className="py-4 px-3 font-mono text-red-500 text-center">{stats?.batting?.ducks || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bowling Career Stats Table */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <div className="flex items-center space-x-2 mb-4 border-b border-[#66fcf1]/10 pb-3">
                  <Zap className="w-5 h-5 text-[#66fcf1]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white font-mono">Bowling Career statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                      <tr>
                        <th className="py-3 px-3 text-center">Matches</th>
                        <th className="py-3 px-3 text-center">Overs</th>
                        <th className="py-3 px-3 text-center">Runs Conceded</th>
                        <th className="py-3 px-3 text-center">Wickets</th>
                        <th className="py-3 px-3 text-center">Best Bowling</th>
                        <th className="py-3 px-3 text-center">Economy</th>
                        <th className="py-3 px-3 text-center">Average</th>
                        <th className="py-3 px-3 text-center">Maidens</th>
                        <th className="py-3 px-3 text-center">Five Wickets (5w)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-4 px-3 font-mono font-bold text-white text-center">{stats?.bowling?.matches || 0}</td>
                        <td className="py-4 px-3 font-mono text-white text-center font-bold">
                          {stats?.bowling?.ballsBowled ? `${Math.floor(stats.bowling.ballsBowled / 6)}.${stats.bowling.ballsBowled % 6}` : '0.0'}
                        </td>
                        <td className="py-4 px-3 font-mono text-red-400 text-center">{stats?.bowling?.runsConceded || 0}</td>
                        <td className="py-4 px-3 font-mono font-bold text-pink-400 text-center">{stats?.bowling?.wickets || 0}</td>
                        <td className="py-4 px-3 font-mono text-amber-400 text-center">{stats?.bowling?.bestBowling || '0/0'}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.bowling?.economy ? stats.bowling.economy.toFixed(2) : '0.00'}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.bowling?.average ? stats.bowling.average.toFixed(2) : '0.00'}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.bowling?.maidens || 0}</td>
                        <td className="py-4 px-3 font-mono text-white text-center">{stats?.bowling?.fiveWickets || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Fielding Career Stats Table */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <div className="flex items-center space-x-2 mb-4 border-b border-[#66fcf1]/10 pb-3">
                  <User className="w-5 h-5 text-[#66fcf1]" />
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-white font-mono">Fielding Career statistics</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                      <tr>
                        <th className="py-3 px-3 text-center">Catches</th>
                        <th className="py-3 px-3 text-center">Run Outs</th>
                        <th className="py-3 px-3 text-center">Stumpings</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-white/5 hover:bg-white/5 transition">
                        <td className="py-4 px-3 font-mono font-bold text-white text-center">{stats?.fielding?.catches || 0}</td>
                        <td className="py-4 px-3 font-mono font-bold text-[#66fcf1] text-center">{stats?.fielding?.runOuts || 0}</td>
                        <td className="py-4 px-3 font-mono font-bold text-white text-center">{stats?.fielding?.stumpings || 0}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'graphs' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Radar chart of player skills */}
              <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col items-center">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Skill Index Profile</h3>
                <div className="h-64 w-full max-w-sm">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={skillProfile}>
                      <PolarGrid stroke="rgba(255, 255, 255, 0.05)" />
                      <PolarAngleAxis dataKey="subject" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                      <PolarRadiusAxis stroke="rgba(255,255,255,0.1)" fontSize={9} />
                      <Radar name={player.name} dataKey="A" stroke="#66fcf1" fill="#66fcf1" fillOpacity={0.25} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line chart of runs scores */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Recent runs scoring trend</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                      <XAxis dataKey="match" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          background: '#0b0c10',
                          border: '1px solid rgba(102,252,241,0.2)',
                          borderRadius: '8px',
                          color: '#fff',
                        }}
                      />
                      <Line type="monotone" dataKey="runs" stroke="#39ff14" strokeWidth={3} dot={{ fill: '#39ff14' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'matches' && (
            <div className="glass-card p-6 border-[#66fcf1]/10">
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-4">Historical match scores</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                    <tr>
                      <th className="py-3 px-3">DATE</th>
                      <th className="py-3 px-3 font-mono text-center">RUNS</th>
                      <th className="py-3 px-3 font-mono text-center">BALLS</th>
                      <th className="py-3 px-3 font-mono text-center">WKTS</th>
                      <th className="py-3 px-3 font-mono text-right">OVERS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matchHistory?.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-gray-600 italic">No recent match history items recorded</td>
                      </tr>
                    ) : (
                      matchHistory?.map((match, i) => (
                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition">
                          <td className="py-3.5 px-3">{new Date(match.date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-3 font-mono font-bold text-white text-center">{match.runs}</td>
                          <td className="py-3.5 px-3 font-mono text-center">{match.balls}</td>
                          <td className="py-3.5 px-3 font-mono text-center text-pink-400">{match.wickets}</td>
                          <td className="py-3.5 px-3 font-mono text-right">{match.overs}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Default achievement badge cards */}
              <div className="glass-card p-5 border-yellow-500/20 text-center relative overflow-hidden">
                <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3 animate-bounce" />
                <h4 className="font-bold text-white text-sm">Centurion Club</h4>
                <p className="text-gray-500 text-xs mt-1">Awarded for scoring a century (100+ runs) in a single championship match.</p>
              </div>

              <div className="glass-card p-5 border-[#66fcf1]/20 text-center relative overflow-hidden">
                <Star className="w-12 h-12 text-[#66fcf1] mx-auto mb-3 animate-spin-slow" />
                <h4 className="font-bold text-white text-sm">MVP Match Winner</h4>
                <p className="text-gray-500 text-xs mt-1">Awarded for winning Most Valuable Player accolades in structural tournaments.</p>
              </div>

              <div className="glass-card p-5 border-purple-500/20 text-center relative overflow-hidden">
                <Award className="w-12 h-12 text-purple-500 mx-auto mb-3" />
                <h4 className="font-bold text-white text-sm">Five-Wicket Club</h4>
                <p className="text-gray-500 text-xs mt-1">Awarded for taking 5 wickets or more during bowling innings.</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
