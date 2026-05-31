'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { Award, Users, Trophy, User, Plus, Compass, CheckCircle, AlertCircle, RefreshCw, Key, Trash2 } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

interface Team {
  _id: string;
  name: string;
  joinCode?: string;
  logo?: string;
  captain?: { _id: string; name: string };
  players: string[];
  stats: { played: number; won: number; lost: number; tied: number };
  owner?: { _id: string; username: string };
}

export default function TeamsPage() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Join code states
  const [joinCode, setJoinCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  // Create team states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamLogo, setNewTeamLogo] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/teams');
      if (response.data.success) {
        setTeams(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleJoinViaCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;

    setJoinLoading(true);
    setJoinError(null);
    setJoinSuccess(null);

    try {
      const response = await api.post('/teams/join-code', { code: joinCode });
      if (response.data.success) {
        setJoinSuccess(response.data.message || 'Join request submitted!');
        setJoinCode('');
        fetchTeams();
      }
    } catch (err: any) {
      console.error(err);
      setJoinError(err.response?.data?.message || 'Failed to submit join request');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) return;

    setCreateLoading(true);
    setCreateError(null);

    const logoUrl = newTeamLogo || `https://images.unsplash.com/photo-1540747737956-378724044453?auto=format&fit=crop&q=80&w=100`;

    try {
      const response = await api.post('/teams', {
        name: newTeamName,
        logo: logoUrl
      });
      if (response.data.success) {
        setNewTeamName('');
        setNewTeamLogo('');
        setShowCreateForm(false);
        alert('Team created successfully!');
        fetchTeams();
      }
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.message || 'Failed to create team');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteTeam = async (e: React.MouseEvent, teamId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const confirm = window.confirm('Are you sure you want to delete this team?');
    if (!confirm) return;

    try {
      const response = await api.delete(`/teams/${teamId}`);
      if (response.data.success) {
        alert('Team deleted successfully!');
        fetchTeams();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete team');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Page Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">Teams Hub</h1>
              <p className="text-gray-400 text-sm mt-1">Official franchises, squad configurations, and roster requests.</p>
            </div>

            {/* Create Team Trigger */}
            {isAuthenticated && (
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center space-x-1.5 py-2.5 px-5 bg-gradient-to-r from-[#66fcf1] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition"
              >
                <Plus className="w-5 h-5" />
                <span>{showCreateForm ? 'Cancel Creation' : 'Create Team'}</span>
              </button>
            )}
          </div>

          {/* Form Actions (Join / Create Panels) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Enter Code Panel */}
            {isAuthenticated && (
              <div className="glass-card p-6 border-[#66fcf1]/15 flex flex-col justify-between">
                <div>
                  <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                    <Key className="w-5 h-5 text-[#66fcf1]" />
                    <span>Join Squad via Code</span>
                  </h3>
                  <p className="text-gray-500 text-xs mb-4">
                    Enter the 6-digit alphanumeric join code provided by your captain or team owner:
                  </p>

                  {joinError && (
                    <div className="mb-4 p-3 rounded-lg bg-red-950/45 border border-red-500/30 flex items-start space-x-2 text-red-400 text-xs">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{joinError}</span>
                    </div>
                  )}

                  {joinSuccess && (
                    <div className="mb-4 p-3 rounded-lg bg-emerald-950/45 border border-emerald-500/30 flex items-start space-x-2 text-emerald-400 text-xs">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{joinSuccess}</span>
                    </div>
                  )}
                </div>

                <form onSubmit={handleJoinViaCode} className="space-y-4">
                  <input
                    type="text"
                    placeholder="e.g. AB12CF"
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-[#66fcf1]/20 rounded-lg py-2.5 px-3 text-sm text-center text-[#66fcf1] font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-[#66fcf1]/50"
                  />
                  <button
                    type="submit"
                    disabled={joinLoading || !joinCode}
                    className="w-full py-2 bg-[#66fcf1]/10 hover:bg-[#66fcf1]/20 text-[#66fcf1] border border-[#66fcf1]/30 font-bold rounded-lg transition disabled:opacity-50 text-xs tracking-wider"
                  >
                    {joinLoading ? 'SUBMITTING...' : 'SUBMIT CODE'}
                  </button>
                </form>
              </div>
            )}

            {/* Create Team Form Panel */}
            {showCreateForm && (
              <div className="lg:col-span-2 glass-card p-6 border-[#66fcf1]/15">
                <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Create New Cricket Franchise</h3>
                <p className="text-gray-500 text-xs mb-4">Establish your team name and details to start inviting players.</p>

                {createError && (
                  <div className="mb-4 p-3 rounded-lg bg-red-950/45 border border-red-500/30 text-red-400 text-xs">
                    {createError}
                  </div>
                )}

                <form onSubmit={handleCreateTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Team Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Chennai Super Kings"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Logo URL (Optional)</label>
                      <input
                        type="text"
                        placeholder="https://image-link.com"
                        value={newTeamLogo}
                        onChange={(e) => setNewTeamLogo(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex flex-col justify-end">
                    <button
                      type="submit"
                      disabled={createLoading || !newTeamName}
                      className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold rounded-lg transition disabled:opacity-50"
                    >
                      {createLoading ? 'CREATING...' : 'ESTABLISH FRANCHISE'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* List of Teams */}
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center space-x-2">
              <Compass className="w-6 h-6 text-[#66fcf1]" />
              <span>CricVerse Leagues</span>
            </h3>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass-card p-6 h-48 animate-pulse bg-gray-900/40"></div>
                ))}
              </div>
            ) : teams.length === 0 ? (
              <div className="glass-card p-10 text-center border-dashed border-[#66fcf1]/20">
                <Award className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">No Teams Created</h3>
                <p className="text-gray-500 text-sm mb-6">No teams created yet. Create your first team.</p>
                {isAuthenticated && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="py-2.5 px-6 bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition text-xs uppercase"
                  >
                    Create a team
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map((team) => {
                  const isOwner = user && team.owner && (
                    (typeof team.owner === 'object' && team.owner._id === user._id) || 
                    (typeof team.owner === 'string' && team.owner === user._id)
                  );
                  const canDelete = user?.role === 'admin' || isOwner;

                  return (
                    <Link
                      key={team._id}
                      href={`/teams/${team._id}`}
                      className="glass-card glass-card-hover p-6 flex flex-col justify-between border-[#66fcf1]/10 block relative group"
                    >
                      {/* Delete Team Button */}
                      {canDelete && (
                        <button
                          onClick={(e) => handleDeleteTeam(e, team._id)}
                          className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition duration-200 z-10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2 pr-8">
                        <h2 className="text-base font-extrabold text-white uppercase truncate max-w-[180px]">{team.name}</h2>
                        {team.joinCode && (
                          <span className="font-mono text-[9px] bg-gray-800 border border-white/5 text-[#66fcf1] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                            Code: {team.joinCode}
                          </span>
                        )}
                      </div>

                      <div className="text-xs space-y-2 text-gray-400">
                        <p className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span>
                            Captain:{' '}
                            <span className="text-white font-semibold">{team.captain?.name || 'Unassigned'}</span>
                          </span>
                        </p>
                        <p className="flex items-center space-x-2">
                          <Users className="w-4 h-4 text-gray-500" />
                          <span>
                            Squad Size:{' '}
                            <span className="text-white font-semibold">{team.players?.length || 0} players</span>
                          </span>
                        </p>
                      </div>

                      <div className="border-t border-white/5 pt-4 mt-4 flex items-center justify-between">
                        <div className="flex items-center space-x-3 text-xs font-mono font-bold">
                          <span className="text-gray-500">P: {team.stats?.played || 0}</span>
                          <span className="text-emerald-400">W: {team.stats?.won || 0}</span>
                          <span className="text-red-400">L: {team.stats?.lost || 0}</span>
                        </div>
                        <span className="text-xs font-bold text-[#66fcf1] group-hover:underline">Squad profile &rarr;</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
