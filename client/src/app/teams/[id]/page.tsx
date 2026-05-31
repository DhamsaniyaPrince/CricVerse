'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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
  Key
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
  owner: UserProfile;
  captain?: Player;
  players: Player[];
  stats: { played: number; won: number; lost: number; tied: number };
  joinRequests: { _id: string; user: UserProfile; status: string; requestedAt: string }[];
  invitations: { _id: string; user: UserProfile; status: string; invitedAt: string }[];
}

export default function TeamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'squad' | 'invites' | 'analytics'>('squad');

  // Management states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [assignCaptainId, setAssignCaptainId] = useState('');
  const [assigningCaptain, setAssigningCaptain] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [selectedRole, setSelectedRole] = useState<'Captain' | 'Vice Captain' | 'Player'>('Player');
  const [roleSaving, setRoleSaving] = useState(false);

  const fetchTeamDetails = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (teamId) fetchTeamDetails();
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
        fetchTeamDetails();
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
        fetchTeamDetails();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to respond to request');
    }
  };

  const handleAssignCaptain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignCaptainId) return;

    setAssigningCaptain(true);
    try {
      const response = await api.post(`/teams/${teamId}/captain`, { captainId: assignCaptainId });
      if (response.data.success) {
        alert('Captain assigned successfully!');
        fetchTeamDetails();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to assign captain');
    } finally {
      setAssigningCaptain(false);
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
        fetchTeamDetails();
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
        fetchTeamDetails();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove player');
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

  // Is current logged in user the team owner?
  const isOwner = isAuthenticated && user && team.owner && (team.owner._id === user._id || user.role === 'admin');

  // Chart computations
  const winRate = team.stats.played > 0 ? Math.round((team.stats.won / team.stats.played) * 100) : 0;
  
  const pieData = [
    { name: 'Wins', value: team.stats.won, color: '#39ff14' },
    { name: 'Losses', value: team.stats.lost, color: '#ff007f' },
    { name: 'Ties', value: team.stats.tied, color: '#4b5563' }
  ].filter(d => d.value > 0);

  // Batting runs comparison across squad
  const playerRunsData = team.players.map(p => ({
    name: p.name,
    runs: p.stats?.batting?.runs || 0
  })).slice(0, 5); // top 5

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Header Team Profile card */}
          <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/10 relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row items-center space-x-0 md:space-x-6 text-center md:text-left">
                <div className="w-20 h-20 rounded-2xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-3xl border border-[#66fcf1]/25 overflow-hidden mb-4 md:mb-0">
                  {team.logo ? (
                    <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    team.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white uppercase tracking-wider">{team.name}</h1>
                  <p className="text-gray-400 text-sm mt-1 flex items-center justify-center md:justify-start space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <span>Owner: {team.owner?.username || 'Unassigned'}</span>
                  </p>
                  <p className="text-gray-400 text-xs mt-1 flex items-center justify-center md:justify-start space-x-2">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span>Captain: {team.captain?.name || 'Unassigned'}</span>
                  </p>
                </div>
              </div>

              {/* Join code display */}
              {isOwner && team.joinCode && (
                <div className="bg-[#1f2833]/50 border border-[#66fcf1]/30 p-4 rounded-xl text-center">
                  <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider block">TEAM JOIN CODE</span>
                  <span className="font-mono text-xl font-bold text-[#66fcf1] block mt-1 tracking-widest">{team.joinCode}</span>
                </div>
              )}
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="glass-card p-4 border-white/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Matches</span>
              <span className="text-xl font-bold font-mono text-white mt-1 block">{team.stats.played}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Win Rate</span>
              <span className="text-xl font-bold font-mono text-[#66fcf1] mt-1 block">{winRate}%</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Wins</span>
              <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">{team.stats.won}</span>
            </div>
            <div className="glass-card p-4 border-white/5 text-center">
              <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Losses</span>
              <span className="text-xl font-bold font-mono text-red-400 mt-1 block">{team.stats.lost}</span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8">
            <button
              onClick={() => setActiveTab('squad')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'squad'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Squad Roster ({team.players?.length || 0})
            </button>
            
            {isOwner && (
              <button
                onClick={() => setActiveTab('invites')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                  activeTab === 'invites'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Requests & Invites
              </button>
            )}

            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'analytics'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Performance Charts
            </button>
          </div>

          {/* Tab contents */}
          {activeTab === 'squad' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Squad player grid */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center space-x-2.5 mb-4">
                  <Users className="w-5 h-5 text-[#66fcf1]" />
                  <h3 className="text-md font-bold uppercase tracking-wider text-white">Active Players</h3>
                </div>

                <div className="space-y-3">
                  {team.players.map((player) => (
                    <div
                      key={player._id}
                      className="glass-card p-4 border-white/5 flex items-center justify-between hover:bg-white/5 transition"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-white uppercase">
                          {player.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white">{player.name}</h4>
                          <p className="text-[10px] text-gray-500 font-bold uppercase mt-0.5">
                            {player.role} | {player.battingStyle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        {(() => {
                          const role = player.teamRole || (team.captain?._id === player._id ? 'Captain' : 'Player');
                          if (role === 'Captain') {
                            return (
                              <span className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)]">
                                <Award className="w-3.5 h-3.5" />
                                <span>Captain</span>
                              </span>
                            );
                          } else if (role === 'Vice Captain') {
                            return (
                              <span className="flex items-center space-x-1 text-xs font-bold px-2.5 py-1 rounded-full bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/30 shadow-[0_0_12px_rgba(102,252,241,0.15)]">
                                <Award className="w-3.5 h-3.5" />
                                <span>Vice Captain</span>
                              </span>
                            );
                          } else {
                            return (
                              <span className="flex items-center space-x-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-800/50 text-gray-400 border border-gray-700/30">
                                <User className="w-3.5 h-3.5 text-gray-500" />
                                <span>Player</span>
                              </span>
                            );
                          }
                        })()}

                        {isOwner && (
                          <button
                            onClick={() => handleRemovePlayer(player._id)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg transition"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {team.players.length === 0 && (
                    <p className="text-gray-500 text-sm italic py-4">No players currently registered in squad.</p>
                  )}
                </div>
              </div>

              {/* Side controls (Role management, owner info) */}
              <div>
                {isOwner && team.players.length > 0 && (
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
              </div>
            </div>
          )}

          {activeTab === 'invites' && isOwner && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Send Invitation Form */}
              <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
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
                    className="flex-1 bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none"
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
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
                  <UserCheck className="w-5 h-5 text-[#66fcf1]" />
                  <span>Pending Join Requests</span>
                </h3>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {team.joinRequests?.filter(r => r.status === 'Pending').map((request) => (
                    <div
                      key={request._id}
                      className="p-3 bg-[#0b0c10]/40 rounded-xl border border-white/5 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-bold text-white">{request.user.username}</p>
                        <p className="text-[10px] text-gray-500">{request.user.email}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRespondToRequest(request._id, 'Approved')}
                          className="py-1 px-3 bg-emerald-500 text-gray-900 font-bold rounded text-xs hover:bg-emerald-400 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleRespondToRequest(request._id, 'Rejected')}
                          className="py-1 px-3 bg-red-500 text-white font-bold rounded text-xs hover:bg-red-400 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}

                  {team.joinRequests?.filter(r => r.status === 'Pending').length === 0 && (
                    <p className="text-gray-500 text-xs italic">No pending join requests in queue.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Win Loss Ratio */}
              <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col items-center">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6">Win / Loss Distribution</h3>
                {team.stats.played > 0 && pieData.length > 0 ? (
                  <div className="h-64 w-full max-w-sm">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
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
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs py-24 italic">No matches played yet to draw analytics</p>
                )}
              </div>

              {/* Roster runs comparisons */}
              <div className="glass-card p-6 border-[#66fcf1]/10">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-white mb-6">Top Squad Run-Scorers</h3>
                {playerRunsData.some(d => d.runs > 0) ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={playerRunsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.03)" />
                        <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <YAxis stroke="rgba(255,255,255,0.4)" fontSize={10} />
                        <Tooltip />
                        <Bar dataKey="runs" fill="#66fcf1" radius={[4, 4, 0, 0]} maxBarSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-gray-500 text-xs py-24 text-center italic">Squad players have not registered stats yet</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
