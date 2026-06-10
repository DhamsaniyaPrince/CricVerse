'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import {
  Users,
  Trophy,
  User,
  Shield,
  Trash2,
  Mail,
  UserCheck,
  Award,
  RefreshCw,
  Plus,
  TrendingUp,
  Settings,
  Key,
  Calendar,
  MapPin,
  Activity,
  ChevronRight,
  Star,
  BookOpen,
  Heart,
  Lock,
  PlusCircle,
  FileText,
  X,
  PlusIcon
} from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  avatar?: string;
  teamRole?: 'Captain' | 'Vice Captain' | 'Player';
  stats: {
    batting: { runs: number; strikeRate: number };
    bowling: { wickets: number };
  };
}

interface UserProfile {
  _id: string;
  username: string;
  email: string;
}

interface Team {
  _id: string;
  name: string;
  joinCode?: string;
  logo?: string;
  banner?: string;
  description?: string;
  achievements?: string[];
  owner: UserProfile;
  captain?: Player;
  players: Player[];
  stats: { played: number; won: number; lost: number; tied: number };
  joinRequests: { _id: string; user: UserProfile; status: string; requestedAt: string }[];
  invitations: { _id: string; user: UserProfile; status: string; invitedAt: string }[];
}

interface TeamAnalytics {
  isDetailedStatsAuthorized: boolean;
  team: {
    _id: string;
    name: string;
    logo: string;
    captain?: any;
    owner?: any;
    stats: { played: number; won: number; lost: number; tied: number };
    players: any[];
  };
  rank: number | null;
  totalTeams: number;
  winPercentage?: number;
  tournamentPerformance?: {
    tournamentId: string;
    name: string;
    played: number;
    won: number;
    lost: number;
    tied: number;
  }[];
  rankingTrends?: { matchName: string; points: number }[];
  headToHead?: {
    opponentId: string;
    opponentName: string;
    logo?: string;
    played: number;
    won: number;
    lost: number;
    tied: number;
  }[];
  matches?: any[];
  winLossTrends?: {
    matchId: string;
    title: string;
    date: string;
    runsScored: number;
    runsConceded: number;
    outcome: 'W' | 'L' | 'T';
    cumulativeWins: number;
  }[];
  individualPlayerStats?: {
    _id: string;
    name: string;
    role: string;
    avatar?: string;
    matches: number;
    runs: number;
    balls: number;
    wickets: number;
    runsConceded: number;
    oversBowled: number;
  }[];
  monthlyPerformance?: {
    month: string;
    won: number;
    lost: number;
    tied: number;
    played: number;
  }[];
  records?: {
    highestTeamScore: number;
    lowestTeamScore: number;
    highestIndividualScore: { runs: number; playerName: string; matchTitle: string };
    bestBowlingFigure: { wickets: number; runsConceded: number; playerName: string; matchTitle: string } | null;
    bestWinMargin: { type: string; value: number; margin: string; matchTitle: string };
    worstLossMargin: { type: string; value: number; margin: string; matchTitle: string };
    bestTeamMatch: { matchId: string; title: string; runs: number; date: string; opponent: string; result: string } | null;
    worstTeamMatch: { matchId: string; title: string; runs: number; date: string; opponent: string; result: string } | null;
  };
  predictions?: {
    matchId: string;
    title: string;
    opponent: { _id: string; name: string; logo?: string };
    venue: string;
    date: string;
    winProbability: number;
    insights: string;
  }[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [analytics, setAnalytics] = useState<TeamAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'squad' | 'analytics' | 'history' | 'invites'>('squad');

  // Management states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assignCaptainId, setAssignCaptainId] = useState('');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Captain' | 'Vice Captain' | 'Player'>('Player');
  const [roleSaving, setRoleSaving] = useState(false);

  // Edit profile states
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    logo: '',
    banner: '',
    description: '',
    achievements: [] as string[]
  });
  const [newAchievement, setNewAchievement] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const fetchTeamDetails = async () => {
    try {
      const response = await api.get(`/teams/${teamId}`);
      if (response.data.success) {
        setTeam(response.data.data);
        if (response.data.data.captain) {
          setAssignCaptainId(response.data.data.captain._id);
        }
      }
    } catch (err) {
      console.error('Error fetching team details:', err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await api.get(`/analytics/team/${teamId}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching team analytics:', err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([fetchTeamDetails(), fetchAnalytics()]);
    setIsLoading(false);
  };

  useEffect(() => {
    if (teamId) loadData();
  }, [teamId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviteLoading(true);
    try {
      const response = await api.post(`/teams/${teamId}/invite`, { userEmail: inviteEmail });
      if (response.data.success) {
        alert(response.data.message || 'Invitation sent successfully!');
        setInviteEmail('');
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRespondToRequest = async (requestId: string, response: 'Approved' | 'Rejected') => {
    try {
      const res = await api.post(`/teams/${teamId}/requests/respond`, { requestId, response });
      if (res.data.success) {
        alert(`Join request successfully ${response.toLowerCase()}!`);
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to respond to request');
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerId || !selectedRole) return;

    setRoleSaving(true);
    try {
      const response = await api.post(`/teams/${teamId}/member-role`, {
        playerId: selectedPlayerId,
        teamRole: selectedRole
      });
      if (response.data.success) {
        alert(response.data.message || 'Role updated successfully!');
        setSelectedPlayerId('');
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update member role');
    } finally {
      setRoleSaving(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const confirm = window.confirm('Are you sure you want to remove this player from the squad?');
    if (!confirm) return;

    try {
      const response = await api.delete(`/teams/${teamId}/players/${playerId}`);
      if (response.data.success) {
        alert('Player successfully removed from squad roster.');
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove player');
    }
  };

  const handleOpenEditModal = () => {
    if (!team) return;
    setEditForm({
      name: team.name,
      logo: team.logo || '',
      banner: team.banner || '',
      description: team.description || '',
      achievements: team.achievements || []
    });
    setNewAchievement('');
    setShowEditModal(true);
  };

  const handleAddAchievement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newAchievement.trim()) return;
    if (editForm.achievements.includes(newAchievement.trim())) return;
    setEditForm({
      ...editForm,
      achievements: [...editForm.achievements, newAchievement.trim()]
    });
    setNewAchievement('');
  };

  const handleRemoveAchievement = (idx: number) => {
    setEditForm({
      ...editForm,
      achievements: editForm.achievements.filter((_, i) => i !== idx)
    });
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    try {
      const response = await api.put(`/teams/${teamId}`, editForm);
      if (response.data.success) {
        alert('Team profile updated successfully!');
        setShowEditModal(false);
        loadData();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to update team profile');
    } finally {
      setEditSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center p-8 glass-card max-w-sm">
          <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Team Not Found</h2>
          <button onClick={() => router.push('/teams')} className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] font-bold rounded">
            Back to Teams
          </button>
        </div>
      </div>
    );
  }

  // Permissions check
  const isOwner = isAuthenticated && user && team.owner && (team.owner._id === user._id || user.role === 'admin');
  const isCaptain = isAuthenticated && user && team.captain && (team.captain.name === user.username || user.role === 'admin');
  const isManager = isOwner || isCaptain;

  // Basic stats mapping
  const stats = analytics?.team?.stats || team.stats;
  const played = stats.played || 0;
  const won = stats.won || 0;
  const lost = stats.lost || 0;
  const tied = stats.tied || 0;
  const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
  const rank = analytics?.rank || 'N/A';
  const totalTeams = analytics?.totalTeams || 'N/A';

  // Pie chart win/loss data
  const pieData = [
    { name: 'Wins', value: won, color: '#39ff14' },
    { name: 'Losses', value: lost, color: '#ff007f' },
    { name: 'Ties', value: tied, color: '#4b5563' }
  ].filter(d => d.value > 0);

  // Top squad performers batting/bowling
  const squadPerformersData = analytics?.individualPlayerStats || [];
  const battingRunsData = [...squadPerformersData]
    .sort((a, b) => b.runs - a.runs)
    .slice(0, 5)
    .map(p => ({ name: p.name, runs: p.runs }));

  const bowlingWicketsData = [...squadPerformersData]
    .sort((a, b) => b.wickets - a.wickets)
    .slice(0, 5)
    .map(p => ({ name: p.name, wickets: p.wickets }));

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          
          {/* Top Banner Card */}
          <div className="glass-card mb-8 border-[#66fcf1]/10 overflow-hidden relative">
            <div className="h-44 md:h-60 w-full relative overflow-hidden">
              <img 
                src={team.banner || 'https://images.unsplash.com/photo-1540747737956-37872f747ee7?auto=format&fit=crop&q=80&w=1200'} 
                alt={`${team.name} Banner`} 
                className="w-full h-full object-cover brightness-[0.4]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] to-transparent"></div>
              
              {isManager && (
                <button
                  onClick={handleOpenEditModal}
                  className="absolute top-4 right-4 py-2 px-4 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-black uppercase rounded-xl shadow-lg transition duration-200 flex items-center space-x-1.5"
                >
                  <Settings className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>

            <div className="p-6 md:p-8 -mt-16 md:-mt-24 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center md:items-end space-y-4 md:space-y-0 md:space-x-6">
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-3xl md:text-5xl border-4 border-[#0b0c10] overflow-hidden shadow-2xl relative">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    team.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="space-y-1.5 md:pb-2">
                  <h1 className="text-2xl md:text-4xl font-black text-white uppercase tracking-wider">{team.name}</h1>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3.5 text-xs text-gray-400">
                    <span className="flex items-center space-x-1.5">
                      <User className="w-4 h-4 text-gray-500" />
                      <span>Owner: <strong className="text-white">{team.owner?.username || 'Unassigned'}</strong></span>
                    </span>
                    <span className="hidden md:inline text-gray-600">|</span>
                    <span className="flex items-center space-x-1.5">
                      <Users className="w-4 h-4 text-gray-500" />
                      <span>Squad: <strong className="text-white">{team.players?.length || 0} Members</strong></span>
                    </span>
                  </div>
                </div>
              </div>

              {isManager && team.joinCode && (
                <div className="bg-[#1f2833]/50 backdrop-blur-md border border-[#66fcf1]/20 px-5 py-3 rounded-2xl text-center shadow-xl self-center md:self-auto">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider block">TEAM JOIN CODE</span>
                  <span className="font-mono text-lg md:text-2xl font-black text-[#66fcf1] block mt-0.5 tracking-widest">{team.joinCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description & Captain Info Block */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="lg:col-span-2 flex flex-col justify-between p-6 glass-card border-white/5">
              <div className="space-y-3.5">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">
                  Team Biography & Rules
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line italic">
                  {team.description || `No description has been registered for ${team.name} yet. Owners or Captains can set one up to explain team strategies, guidelines, and roster rules.`}
                </p>
              </div>
            </div>

            <div className="p-6 glass-card border-white/5 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 rounded-full blur-xl pointer-events-none"></div>
              <div className="space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-yellow-500 border-b border-white/5 pb-2 flex items-center space-x-1.5">
                  <Award className="w-4.5 h-4.5" />
                  <span>Captain Information</span>
                </h3>
                
                {team.captain ? (
                  <div className="flex items-center space-x-4">
                    <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-yellow-500/30 flex items-center justify-center font-extrabold text-yellow-500 text-xl uppercase overflow-hidden shadow-inner">
                      {team.captain.avatar ? (
                        <img src={team.captain.avatar} alt={team.captain.name} className="w-full h-full object-cover" />
                      ) : (
                        team.captain.name.charAt(0)
                      )}
                    </div>
                    <div>
                      <h4 
                        onClick={() => router.push(`/players/${team.captain?._id}`)}
                        className="font-black text-white hover:text-yellow-400 cursor-pointer transition uppercase text-base tracking-wide"
                      >
                        {team.captain.name}
                      </h4>
                      <span className="text-[10px] text-gray-500 font-extrabold block uppercase tracking-wider mt-0.5">
                        {team.captain.role}
                      </span>
                      <span className="text-[10px] text-gray-500 font-bold block uppercase">
                        {team.captain.battingStyle}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-950/10 border border-yellow-500/10 rounded-xl text-center text-xs text-yellow-500 font-semibold italic">
                    No Captain Assigned
                  </div>
                )}
              </div>

              {team.captain && (
                <button
                  onClick={() => router.push(`/players/${team.captain?._id}`)}
                  className="w-full mt-6 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/25 text-yellow-400 font-bold text-xs uppercase rounded-xl tracking-wider transition"
                >
                  View Captain Profile
                </button>
              )}
            </div>
          </div>

          {/* Detailed Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Matches</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{played}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Wins</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{won}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Losses</span>
              <span className="text-xl font-bold font-mono text-rose-500 mt-1 block">{lost}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Ties</span>
              <span className="text-xl font-bold font-mono text-gray-400 mt-1 block">{tied}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Win Rate</span>
              <span className="text-xl font-bold font-mono text-[#66fcf1] mt-1 block">{winRate}%</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">System Rank</span>
              <span className="text-xl font-bold font-mono text-yellow-500 mt-1 block">#{rank} <span className="text-[10px] text-gray-500">/ {totalTeams}</span></span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">High Score</span>
              <span className="text-xl font-bold font-mono text-cyan-400 mt-1 block">{analytics?.records?.highestTeamScore || 0}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center flex flex-col justify-center overflow-hidden">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Best Win</span>
              <span className="text-[9px] font-bold text-emerald-400 mt-1 block truncate" title={analytics?.records?.bestWinMargin?.margin || 'N/A'}>
                {analytics?.records?.bestWinMargin?.margin || 'N/A'}
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab('squad')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'squad' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Squad & Achievements
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'analytics' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Performance Analytics
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'history' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Tournament Log & H2H
            </button>
            {isManager && (
              <button
                onClick={() => setActiveTab('invites')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 text-[#66fcf1] flex items-center space-x-1.5 ${
                  activeTab === 'invites' ? 'border-[#66fcf1] bg-[#66fcf1]/5' : 'border-transparent hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Roster Desk</span>
              </button>
            )}
          </div>

          {/* Tab contents */}
          <div className="space-y-8">
            {/* TAB 1: SQUAD ROSTER & ACHIEVEMENTS */}
            {activeTab === 'squad' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Active Squad Grid */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center space-x-2.5 mb-4">
                    <Users className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Squad Members ({team.players?.length || 0})</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {team.players.map((player) => {
                      const role = player.teamRole || (team.captain?._id === player._id ? 'Captain' : 'Player');
                      return (
                        <div
                          key={player._id}
                          className="glass-card p-4 border-white/5 flex items-center justify-between hover:border-cyan-500/15 transition relative"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div className="w-11 h-11 rounded-2xl bg-gray-800 flex items-center justify-center font-bold text-white uppercase border border-white/5 overflow-hidden">
                              {player.avatar ? (
                                <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                player.name.charAt(0)
                              )}
                            </div>
                            <div>
                              <h4 
                                onClick={() => router.push(`/players/${player._id}`)}
                                className="font-bold text-white hover:text-[#66fcf1] cursor-pointer transition uppercase text-sm"
                              >
                                {player.name}
                              </h4>
                              <p className="text-[9px] text-gray-500 font-bold uppercase mt-0.5">
                                {player.role} | {player.battingStyle}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {role === 'Captain' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 uppercase">
                                Captain
                              </span>
                            )}
                            {role === 'Vice Captain' && (
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/30 uppercase">
                                Vice Cap
                              </span>
                            )}
                            <button
                              onClick={() => router.push(`/players/${player._id}`)}
                              className="p-1 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-lg transition"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {team.players.length === 0 && (
                      <p className="text-gray-500 text-sm italic col-span-2 text-center py-6">No squad members registered.</p>
                    )}
                  </div>
                </div>

                {/* Achievements List */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2.5 mb-4">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Team Trophies</h3>
                  </div>

                  <div className="glass-card p-6 border-white/5 space-y-4">
                    {team.achievements && team.achievements.length > 0 ? (
                      <div className="space-y-3">
                        {team.achievements.map((achievement, i) => (
                          <div key={i} className="flex items-start space-x-3 p-3 bg-yellow-950/5 border border-yellow-500/10 rounded-xl">
                            <Trophy className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5 animate-pulse" />
                            <div>
                              <p className="text-xs font-bold text-white uppercase tracking-wide leading-tight">{achievement}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic text-center py-6">
                        No official achievements registered. Captains can manage achievements via Edit Profile.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ADVANCED ANALYTICS */}
            {activeTab === 'analytics' && (() => {
              const hasData = played > 0;
              const isAuthorized = analytics?.isDetailedStatsAuthorized;

              if (!isAuthorized) {
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Publicly visible win/loss pie chart */}
                    <div className="lg:col-span-1 glass-card p-6 border-white/5 flex flex-col items-center justify-center min-h-[300px]">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Match Win / Loss Distribution</h3>
                      {hasData && pieData.length > 0 ? (
                        <div className="h-48 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="flex justify-center space-x-4 text-xs mt-4">
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]"></span><span className="text-gray-400">Wins ({won})</span></span>
                            <span className="flex items-center space-x-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#ff007f]"></span><span className="text-gray-400">Losses ({lost})</span></span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs italic">No match stats compiled yet.</p>
                      )}
                    </div>

                    {/* Locked details overlay */}
                    <div className="lg:col-span-2 glass-card p-8 border-red-500/20 flex flex-col items-center justify-center text-center relative overflow-hidden min-h-[300px]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none"></div>
                      <Lock className="w-14 h-14 text-red-500 mb-4 animate-bounce" />
                      <h3 className="text-lg font-black text-white uppercase tracking-wider mb-2">Detailed Analytics Locked</h3>
                      <p className="text-gray-400 text-xs max-w-sm leading-relaxed mb-6">
                        Squad performance trends, points progression lines, monthly stats, and match score metrics are restricted to Team Captains, Team Owners, and CricVerse Administrators.
                      </p>
                      <span className="bg-red-950/20 border border-red-500/30 text-red-400 text-[9px] font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider">
                        Access Restricted
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-8">
                  {/* Predictions & AI Insights (Innovation Card) */}
                  {analytics?.predictions && analytics.predictions.length > 0 && (
                    <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">
                        AI Match Predictions
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {analytics.predictions.map((pred) => (
                          <div key={pred.matchId} className="p-4 bg-gray-900/30 border border-white/5 rounded-2xl flex flex-col justify-between space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-gray-500">{pred.title}</span>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {new Date(pred.date).toLocaleDateString()} | {pred.venue}
                              </span>
                            </div>
                            
                            <div className="flex items-center justify-between my-2">
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-white text-sm">{team.name}</span>
                                <span className="text-xs font-bold text-gray-500">vs</span>
                                <span className="font-bold text-white text-sm">{pred.opponent.name}</span>
                              </div>
                              <span className="font-mono text-base font-black text-[#66fcf1]">{pred.winProbability}% Chance</span>
                            </div>
                            
                            <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-400 to-[#66fcf1]" style={{ width: `${pred.winProbability}%` }}></div>
                            </div>
                            
                            <p className="text-[10px] text-gray-400 italic mt-1 leading-relaxed">
                              {pred.insights}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Team Records Block */}
                  {analytics?.records && (
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white border-b border-white/5 pb-2 mb-6">
                        Team Roster Records
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="p-4 bg-[#0b0c10]/45 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Highest Team Score</span>
                          <span className="text-2xl font-black font-mono text-cyan-400 mt-1 block">
                            {analytics.records.highestTeamScore} runs
                          </span>
                        </div>
                        <div className="p-4 bg-[#0b0c10]/45 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Lowest Team Score</span>
                          <span className="text-2xl font-black font-mono text-rose-500 mt-1 block">
                            {analytics.records.lowestTeamScore} runs
                          </span>
                        </div>
                        <div className="p-4 bg-[#0b0c10]/45 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Highest Indiv. Score</span>
                          <span className="text-sm font-bold text-white mt-1 block truncate">
                            {analytics.records.highestIndividualScore.playerName} ({analytics.records.highestIndividualScore.runs})
                          </span>
                          <span className="text-[9px] text-gray-500 block truncate">{analytics.records.highestIndividualScore.matchTitle}</span>
                        </div>
                        <div className="p-4 bg-[#0b0c10]/45 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider block">Best Bowling Figures</span>
                          {analytics.records.bestBowlingFigure ? (
                            <>
                              <span className="text-sm font-bold text-white mt-1 block truncate">
                                {analytics.records.bestBowlingFigure.playerName} ({analytics.records.bestBowlingFigure.wickets}/{analytics.records.bestBowlingFigure.runsConceded})
                              </span>
                              <span className="text-[9px] text-gray-500 block truncate">{analytics.records.bestBowlingFigure.matchTitle}</span>
                            </>
                          ) : (
                            <span className="text-sm font-bold text-gray-500 mt-1 block">N/A</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Chart Visualizations */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Points Progression Line Chart */}
                    <div className="glass-card p-6 border-[#66fcf1]/10">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>Cumulative League Points Trend</span>
                      </h3>
                      {analytics?.rankingTrends && analytics.rankingTrends.length > 0 ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={analytics.rankingTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                              <XAxis dataKey="matchName" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(102,252,241,0.1)' }} />
                              <Line type="monotone" dataKey="points" stroke="#66fcf1" strokeWidth={3} activeDot={{ r: 8 }} dot={{ stroke: '#66fcf1', strokeWidth: 2, r: 4 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs py-24 text-center italic">No trend data available. Play league matches to record points trend.</p>
                      )}
                    </div>

                    {/* Monthly Performance Bar Chart */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Monthly Match Breakdown</h3>
                      {analytics?.monthlyPerformance && analytics.monthlyPerformance.length > 0 ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analytics.monthlyPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                              <XAxis dataKey="month" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(102,252,241,0.1)' }} />
                              <Bar dataKey="won" fill="#39ff14" radius={[4, 4, 0, 0]} maxBarSize={15} name="Wins" />
                              <Bar dataKey="lost" fill="#ff007f" radius={[4, 4, 0, 0]} maxBarSize={15} name="Losses" />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs py-24 text-center italic">No monthly match history available.</p>
                      )}
                    </div>

                    {/* Squad Runs comparisons */}
                    <div className="glass-card p-6 border-white/5">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Top Squad Run-Scorers</h3>
                      {battingRunsData.some(d => d.runs > 0) ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={battingRunsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(102,252,241,0.1)' }} />
                              <Bar dataKey="runs" fill="#66fcf1" radius={[4, 4, 0, 0]} maxBarSize={25} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs py-24 text-center italic">Squad players have not registered batting runs yet.</p>
                      )}
                    </div>

                    {/* Squad Wickets comparisons */}
                    <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Top Squad Wicket-Takers</h3>
                      {bowlingWicketsData.some(d => d.wickets > 0) ? (
                        <div className="h-64 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={bowlingWicketsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                              <Tooltip contentStyle={{ backgroundColor: '#1f2833', border: '1px solid rgba(102,252,241,0.1)' }} />
                              <Bar dataKey="wickets" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={25} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-gray-500 text-xs py-24 text-center italic">Squad players have not registered wickets yet.</p>
                      )}
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* TAB 3: TOURNAMENT HISTORY & H2H */}
            {activeTab === 'history' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Completed Match Logs */}
                <div className="lg:col-span-2 space-y-4">
                  <div className="flex items-center space-x-2.5 mb-4">
                    <Activity className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Tournament Match History</h3>
                  </div>

                  <div className="space-y-4">
                    {analytics?.matches && analytics.matches.length > 0 ? (
                      analytics.matches.map((match) => (
                        <div
                          key={match._id}
                          className="glass-card p-5 border-white/5 flex flex-col justify-between space-y-4 hover:border-cyan-500/10 transition relative"
                        >
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase">
                              {match.tournament?.name || 'CRICVERSE CUP'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {new Date(match.date || match.createdAt).toLocaleDateString()} | {match.venue}
                            </span>
                          </div>

                          <div className="space-y-2 font-mono">
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-white font-bold">{match.teamA?.name || 'Team A'}</span>
                              <span className="text-[#66fcf1] font-bold">
                                {match.score?.teamA?.runs ?? 0}/{match.score?.teamA?.wickets ?? 0}
                                <span className="text-[10px] text-gray-500 pl-1.5">({match.score?.teamA?.overs ?? 0} ov)</span>
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-sm">
                              <span className="text-white font-bold">{match.teamB?.name || 'Team B'}</span>
                              <span className="text-[#66fcf1] font-bold">
                                {match.score?.teamB?.runs ?? 0}/{match.score?.teamB?.wickets ?? 0}
                                <span className="text-[10px] text-gray-500 pl-1.5">({match.score?.teamB?.overs ?? 0} ov)</span>
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                            <span className="text-xs text-emerald-400 font-semibold italic">
                              {match.result?.winner?.toString() === teamId.toString() ? 'WON' : 'LOST'}{' '}
                              {match.result?.margin || 'Match Completed'}
                            </span>
                            <button
                              onClick={() => router.push(`/matches/${match._id}`)}
                              className="py-1 px-3 bg-[#1f2833]/80 border border-white/10 hover:bg-[#1f2833] text-white font-bold rounded text-xs transition uppercase"
                            >
                              Details
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-xs italic text-center py-12 glass-card">
                        No matches registered for this team yet. Host or join a tournament to start match registration.
                      </p>
                    )}
                  </div>
                </div>

                {/* Head to Head Record list */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2.5 mb-4">
                    <Trophy className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">Head-to-Head Opponents</h3>
                  </div>

                  <div className="glass-card p-6 border-white/5 space-y-4">
                    {analytics?.headToHead && analytics.headToHead.length > 0 ? (
                      analytics.headToHead.map((h2h) => {
                        const h2hWinRate = h2h.played > 0 ? Math.round((h2h.won / h2h.played) * 100) : 0;
                        return (
                          <div key={h2h.opponentId} className="p-4 bg-gray-900/40 border border-white/5 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-white text-sm overflow-hidden border border-white/5">
                                {h2h.logo ? <img src={h2h.logo} alt={h2h.opponentName} className="w-full h-full object-cover" /> : h2h.opponentName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-bold text-white text-xs uppercase">{h2h.opponentName}</p>
                                <p className="text-[9px] text-gray-500 mt-0.5 font-semibold">
                                  PLAYED: <strong className="text-white">{h2h.played}</strong> | 
                                  W: <strong className="text-emerald-400">{h2h.won}</strong> | 
                                  L: <strong className="text-rose-500">{h2h.lost}</strong>
                                </p>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <span className="font-mono text-xs font-black text-[#66fcf1]">{h2hWinRate}%</span>
                              <span className="text-[8px] text-gray-500 uppercase font-black block tracking-widest mt-0.5">Wins</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-gray-500 text-xs italic text-center py-6">No historical H2H records found.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ROSTER MANAGEMENT DESK */}
            {activeTab === 'invites' && isManager && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Official Invites */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Send Invitation Form */}
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <Mail className="w-5 h-5 text-[#66fcf1]" />
                      <span>Invite Player by Email</span>
                    </h3>
                    <p className="text-gray-500 text-xs mb-4">
                      Send an official team invitation directly to the registered player email address:
                    </p>

                    <form onSubmit={handleInvite} className="flex items-center space-x-3">
                      <input
                        type="email"
                        required
                        placeholder="player@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        className="flex-1 bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                      />
                      <button
                        type="submit"
                        disabled={inviteLoading || !inviteEmail}
                        className="py-2.5 px-5 bg-[#66fcf1] text-[#0b0c10] font-bold rounded-lg hover:bg-cyan-400 transition text-xs uppercase"
                      >
                        {inviteLoading ? 'SENDING...' : 'SEND INVITE'}
                      </button>
                    </form>
                  </div>

                  {/* Join Requests Queue */}
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                      <UserCheck className="w-5 h-5 text-[#66fcf1]" />
                      <span>Pending Join Requests</span>
                    </h3>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {team.joinRequests?.filter(r => r.status === 'Pending').map((request) => (
                        <div
                          key={request._id}
                          className="p-3.5 bg-[#0b0c10]/40 rounded-xl border border-white/5 flex items-center justify-between text-sm"
                        >
                          <div>
                            <p className="font-bold text-white">{request.user.username}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">{request.user.email}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleRespondToRequest(request._id, 'Approved')}
                              className="py-1 px-3.5 bg-emerald-500 text-gray-900 font-bold rounded text-xs hover:bg-emerald-400 transition uppercase"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRespondToRequest(request._id, 'Rejected')}
                              className="py-1 px-3.5 bg-red-950/40 border border-red-500/30 text-red-400 font-bold rounded text-xs hover:bg-red-950 transition uppercase"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}

                      {team.joinRequests?.filter(r => r.status === 'Pending').length === 0 && (
                        <p className="text-gray-500 text-xs italic py-4">No pending join requests in queue.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team Role Assign Panel */}
                <div className="space-y-6">
                  {team.players.length > 0 && (
                    <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-[#66fcf1]/10 pb-3 flex items-center space-x-2">
                        <Settings className="w-4 h-4" />
                        <span>Roster Role Management</span>
                      </h4>
                      
                      <form onSubmit={handleAssignRole} className="space-y-4">
                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Select Squad Member</label>
                          <select
                            value={selectedPlayerId}
                            onChange={(e) => setSelectedPlayerId(e.target.value)}
                            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:border-[#66fcf1] focus:ring-1 focus:ring-[#66fcf1] transition outline-none"
                          >
                            <option value="">Choose Player...</option>
                            {team.players.map(p => (
                              <option key={p._id} value={p._id}>
                                {p.name} ({p.teamRole || (team.captain?._id === p._id ? 'Captain' : 'Player')})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Assign Role</label>
                          <div className="grid grid-cols-3 gap-2">
                            {(['Captain', 'Vice Captain', 'Player'] as const).map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => setSelectedRole(r)}
                                className={`py-2 px-1 text-center font-bold text-[10px] tracking-wider uppercase border rounded-lg transition ${
                                  selectedRole === r
                                    ? r === 'Captain'
                                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500'
                                      : r === 'Vice Captain'
                                      ? 'bg-[#66fcf1]/20 text-[#66fcf1] border-[#66fcf1]'
                                      : 'bg-gray-800 text-white border-gray-600'
                                    : 'bg-transparent text-gray-400 border-white/10 hover:border-white/20'
                                }`}
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={roleSaving || !selectedPlayerId}
                          className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-gray-900 font-bold rounded-lg transition text-xs tracking-wider uppercase disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                          {roleSaving ? 'SAVING...' : 'UPDATE MEMBER ROLE'}
                        </button>
                      </form>
                    </div>
                  )}

                  {/* Removal and de-registrations */}
                  <div className="glass-card p-6 border-red-500/10 space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-red-500 border-b border-red-500/15 pb-3">
                      Dangerous Actions
                    </h4>
                    <p className="text-gray-500 text-xs">
                      Remove squad players or re-configure team parameters. Removing the Captain will demote their role.
                    </p>
                    <div className="space-y-3 pt-2">
                      {team.players.map(player => (
                        <div key={player._id} className="flex justify-between items-center text-xs">
                          <span className="text-gray-300 font-semibold">{player.name}</span>
                          <button
                            onClick={() => handleRemovePlayer(player._id)}
                            className="text-[10px] font-bold text-red-500 hover:text-red-400 uppercase tracking-wide px-2 py-1 bg-red-950/20 border border-red-500/20 rounded-md transition"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* EDIT TEAM PROFILE DIALOG */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-lg w-full p-6 space-y-6 relative border-cyan-500/20">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Settings className="w-6 h-6 text-[#66fcf1]" />
                <span>Edit Team Profile</span>
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                Customize your banner, logos, descriptions, and achievements.
              </p>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Logo URL</label>
                <input
                  type="text"
                  value={editForm.logo}
                  onChange={(e) => setEditForm({ ...editForm, logo: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Banner Image URL</label>
                <input
                  type="text"
                  value={editForm.banner}
                  onChange={(e) => setEditForm({ ...editForm, banner: e.target.value })}
                  placeholder="https://example.com/banner.jpg"
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Description / Rules</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Strategy guidelines, rules, team background..."
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                />
              </div>

              {/* Achievements editing list */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Achievements / Trophies</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="e.g. CPL Champions 2026"
                    value={newAchievement}
                    onChange={(e) => setNewAchievement(e.target.value)}
                    className="flex-1 bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                  />
                  <button
                    onClick={handleAddAchievement}
                    type="button"
                    className="py-2 px-4 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-bold rounded-lg uppercase transition"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editForm.achievements.map((achievement, idx) => (
                    <span key={idx} className="flex items-center space-x-1 bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs px-2.5 py-1 rounded-full uppercase font-bold">
                      <span>{achievement}</span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAchievement(idx)} 
                        className="text-yellow-600 hover:text-yellow-400 ml-1.5 focus:outline-none"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={editSaving}
                className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold text-xs uppercase rounded-lg tracking-wide transition flex items-center justify-center space-x-2 mt-4"
              >
                {editSaving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <span>Save Profile Configuration</span>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
