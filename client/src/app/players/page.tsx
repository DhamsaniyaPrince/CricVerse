'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { User, ShieldAlert, Award, Star, Activity, Search, Plus, Trash2, HelpCircle } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Link from 'next/link';

interface Player {
  _id: string;
  name: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  stats: {
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
    fielding?: {
      catches: number;
      runOuts: number;
      stumpings: number;
    };
  };
}

export default function PlayersPage() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Create Player States
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerRole, setNewPlayerRole] = useState('Batsman');
  const [newPlayerBatting, setNewPlayerBatting] = useState('Right-hand bat');
  const [newPlayerBowling, setNewPlayerBowling] = useState('None');
  const [newPlayerBio, setNewPlayerBio] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const isAuthorized = isAuthenticated && (user?.role === 'admin' || user?.role === 'organizer');

  const fetchPlayers = async () => {
    setIsLoading(true);
    try {
      const response = await api.get(`/players?search=${search}&role=${roleFilter}`);
      if (response.data.success) {
        setPlayers(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching players:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, [roleFilter]); // Refetch when role filters change

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPlayers();
  };

  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName) return;

    setCreateLoading(true);
    setCreateError(null);

    try {
      const response = await api.post('/players', {
        name: newPlayerName,
        role: newPlayerRole,
        battingStyle: newPlayerBatting,
        bowlingStyle: newPlayerBowling,
        bio: newPlayerBio
      });
      if (response.data.success) {
        setNewPlayerName('');
        setNewPlayerRole('Batsman');
        setNewPlayerBatting('Right-hand bat');
        setNewPlayerBowling('None');
        setNewPlayerBio('');
        setShowCreateForm(false);
        alert('Player created successfully!');
        fetchPlayers();
      }
    } catch (err: any) {
      console.error(err);
      setCreateError(err.response?.data?.message || 'Failed to create player');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeletePlayer = async (playerId: string) => {
    const confirm = window.confirm('Are you sure you want to delete this player?');
    if (!confirm) return;

    try {
      const response = await api.delete(`/players/${playerId}`);
      if (response.data.success) {
        alert('Player removed successfully!');
        fetchPlayers();
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete player');
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
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">Players Database</h1>
              <p className="text-gray-400 text-sm mt-1">Detailed biographies and historical analytics for CricVerse cricketers.</p>
            </div>

            {/* Actions & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <form onSubmit={handleSearchSubmit} className="flex items-center space-x-3 w-full md:w-auto">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search player name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-[#1f2833]/30 border border-[#66fcf1]/20 py-2 pl-10 pr-4 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#66fcf1]/50 w-full"
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="bg-[#1f2833]/30 border border-[#66fcf1]/20 py-2 px-3 rounded-xl text-xs text-white focus:outline-none"
                >
                  <option value="" className="bg-[#0b0c10]">All Roles</option>
                  <option value="Batsman" className="bg-[#0b0c10]">Batsman</option>
                  <option value="Bowler" className="bg-[#0b0c10]">Bowler</option>
                  <option value="All-Rounder" className="bg-[#0b0c10]">All-Rounder</option>
                  <option value="Wicket-Keeper" className="bg-[#0b0c10]">Wicket Keeper</option>
                </select>
              </form>

              {isAuthorized && (
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="flex items-center space-x-1.5 py-2.5 px-5 bg-gradient-to-r from-[#66fcf1] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition w-full md:w-auto justify-center"
                >
                  <Plus className="w-5 h-5" />
                  <span>{showCreateForm ? 'Cancel Creation' : 'Create Player'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Creation Form Panel */}
          {showCreateForm && isAuthorized && (
            <div className="glass-card p-6 border-[#66fcf1]/15 mb-10">
              <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">Register New Cricketer</h3>
              <p className="text-gray-500 text-xs mb-4">Input player details below to add them to the player database.</p>

              {createError && (
                <div className="mb-4 p-3 rounded-lg bg-red-950/45 border border-red-500/30 text-red-400 text-xs">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreatePlayer} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Player Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Enter player name..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Role</label>
                    <select
                      value={newPlayerRole}
                      onChange={(e) => setNewPlayerRole(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    >
                      <option value="Batsman">Batsman</option>
                      <option value="Bowler">Bowler</option>
                      <option value="All-Rounder">All-Rounder</option>
                      <option value="Wicket-Keeper">Wicket Keeper</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Batting Style</label>
                    <select
                      value={newPlayerBatting}
                      onChange={(e) => setNewPlayerBatting(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    >
                      <option value="Right-hand bat">Right-hand bat</option>
                      <option value="Left-hand bat">Left-hand bat</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Bowling Style</label>
                    <input
                      type="text"
                      placeholder="e.g. Right-arm fast (or 'None')"
                      value={newPlayerBowling}
                      onChange={(e) => setNewPlayerBowling(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3 flex flex-col justify-between">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Short Biography</label>
                    <textarea
                      placeholder="Player stats, background, etc."
                      value={newPlayerBio}
                      onChange={(e) => setNewPlayerBio(e.target.value)}
                      rows={2}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-1.5 px-3 text-sm text-white focus:outline-none resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={createLoading || !newPlayerName}
                    className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold rounded-lg transition disabled:opacity-50 text-xs tracking-wider"
                  >
                    {createLoading ? 'REGISTERING...' : 'REGISTER CRICKETER'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="glass-card p-6 h-60 animate-pulse bg-gray-900/40"></div>
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="glass-card p-10 text-center border-dashed border-[#66fcf1]/20">
              <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Players Available</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                {search || roleFilter 
                  ? 'No player profiles match your search criteria. Try modifying your filters.'
                  : 'No players have been registered in the CricVerse database yet.'}
              </p>
              {isAuthorized && !search && !roleFilter && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="py-2.5 px-6 bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition text-xs uppercase"
                >
                  Create your first player
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {players.map((player) => (
                <div key={player._id} className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between space-y-4 relative group">
                  {/* Delete player button */}
                  {isAuthorized && (
                    <button
                      onClick={() => handleDeletePlayer(player._id)}
                      className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-950/20 border border-red-500/20 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500 hover:text-white transition duration-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Top Name block */}
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-lg font-extrabold text-white uppercase pr-6">{player.name}</h2>
                      <span className="text-[10px] text-[#66fcf1] font-bold border border-[#66fcf1]/20 px-2 py-0.5 rounded uppercase mt-1 inline-block">
                        {player.role}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center font-bold text-white uppercase flex-shrink-0">
                      {player.name.charAt(0)}
                    </div>
                  </div>

                  {/* Play styles */}
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Batting: <span className="text-white font-medium">{player.battingStyle}</span></p>
                    <p>Bowling: <span className="text-white font-medium">{player.bowlingStyle}</span></p>
                  </div>

                  {/* Career Stats Grid */}
                  <div className="border-t border-[#66fcf1]/5 pt-4 grid grid-cols-5 gap-1 text-center">
                    <div className="bg-[#0b0c10]/40 py-1.5 px-0.5 rounded">
                      <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-tighter">Mat</span>
                      <span className="text-xs font-bold font-mono text-white mt-0.5 block">
                        {player.stats?.batting?.matches || 0}
                      </span>
                    </div>
                    
                    <div className="bg-[#0b0c10]/40 py-1.5 px-0.5 rounded">
                      <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-tighter">Runs</span>
                      <span className="text-xs font-bold font-mono text-emerald-400 mt-0.5 block">
                        {player.stats?.batting?.runs || 0}
                      </span>
                    </div>

                    <div className="bg-[#0b0c10]/40 py-1.5 px-0.5 rounded">
                      <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-tighter">HS</span>
                      <span className="text-xs font-bold font-mono text-amber-400 mt-0.5 block">
                        {player.stats?.batting?.highestScore || 0}
                      </span>
                    </div>

                    <div className="bg-[#0b0c10]/40 py-1.5 px-0.5 rounded">
                      <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-tighter">SR</span>
                      <span className="text-xs font-bold font-mono text-white mt-0.5 block">
                        {player.stats?.batting?.strikeRate ? player.stats.batting.strikeRate.toFixed(1) : '0.0'}
                      </span>
                    </div>

                    <div className="bg-[#0b0c10]/40 py-1.5 px-0.5 rounded">
                      <span className="text-[8px] text-gray-500 font-bold block uppercase tracking-tighter">Wkts</span>
                      <span className="text-xs font-bold font-mono text-pink-400 mt-0.5 block">
                        {player.stats?.bowling?.wickets || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/players/${player._id}`}
                      className="w-full py-2 bg-[#1f2833]/30 hover:bg-[#66fcf1]/10 border border-[#66fcf1]/20 hover:border-[#66fcf1] text-[#66fcf1] text-[10px] font-bold rounded-lg uppercase tracking-wider transition duration-200 flex items-center justify-center space-x-1"
                    >
                      <span>View Full Profile</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
