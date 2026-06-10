'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { 
  ArrowLeft, CheckSquare, Square, Save, AlertCircle, RefreshCw, Trophy, Coins
} from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
}

interface Match {
  _id: string;
  title: string;
  status: string;
  teamA: { _id: string; name: string; logo?: string; players: Player[] };
  teamB: { _id: string; name: string; logo?: string; players: Player[] };
  tournament?: {
    _id: string;
    name: string;
    organizer: { _id: string } | string;
  };
  playingXIA?: Player[];
  playingXIB?: Player[];
  toss?: {
    wonBy: string;
    decision: 'Batting' | 'Bowling';
  };
}

export default function SetupMatchPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Setup Form state
  const [selectedXI_A, setSelectedXI_A] = useState<string[]>([]);
  const [selectedXI_B, setSelectedXI_B] = useState<string[]>([]);
  const [tossWonBy, setTossWonBy] = useState('');
  const [tossDecision, setTossDecision] = useState<'Batting' | 'Bowling'>('Batting');

  useEffect(() => {
    const fetchMatch = async () => {
      try {
        const response = await api.get(`/matches/${matchId}`);
        if (response.data.success) {
          const matchData = response.data.data;
          setMatch(matchData);

          // Populate existing/previously saved details if available
          if (matchData.playingXIA && matchData.playingXIA.length > 0) {
            setSelectedXI_A(matchData.playingXIA.map((p: any) => p._id || p));
          } else {
            // Default to selecting first 11 players
            setSelectedXI_A(matchData.teamA.players.slice(0, 11).map((p: any) => p._id));
          }

          if (matchData.playingXIB && matchData.playingXIB.length > 0) {
            setSelectedXI_B(matchData.playingXIB.map((p: any) => p._id || p));
          } else {
            // Default to selecting first 11 players
            setSelectedXI_B(matchData.teamB.players.slice(0, 11).map((p: any) => p._id));
          }

          if (matchData.toss?.wonBy) {
            const wonByVal = matchData.toss.wonBy;
            setTossWonBy(typeof wonByVal === 'object' && wonByVal ? wonByVal._id : wonByVal);
            setTossDecision(matchData.toss.decision || 'Batting');
          } else {
            setTossWonBy(matchData.teamA._id);
          }
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load match details.');
      } finally {
        setIsLoading(false);
      }
    };

    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  const togglePlayerA = (playerId: string) => {
    if (selectedXI_A.includes(playerId)) {
      setSelectedXI_A(selectedXI_A.filter(id => id !== playerId));
    } else {
      if (selectedXI_A.length < 11) {
        setSelectedXI_A([...selectedXI_A, playerId]);
      } else {
        alert('You can select a maximum of 11 players for the Playing XI.');
      }
    }
  };

  const togglePlayerB = (playerId: string) => {
    if (selectedXI_B.includes(playerId)) {
      setSelectedXI_B(selectedXI_B.filter(id => id !== playerId));
    } else {
      if (selectedXI_B.length < 11) {
        setSelectedXI_B([...selectedXI_B, playerId]);
      } else {
        alert('You can select a maximum of 11 players for the Playing XI.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedXI_A.length < 2) {
      setError(`Team A Playing XI must contain at least 2 players. Currently selected: ${selectedXI_A.length}`);
      return;
    }
    if (selectedXI_B.length < 2) {
      setError(`Team B Playing XI must contain at least 2 players. Currently selected: ${selectedXI_B.length}`);
      return;
    }
    if (selectedXI_A.length !== selectedXI_B.length) {
      setError(`Both teams must have the same number of players selected for their Playing XI (selected: ${selectedXI_A.length} vs ${selectedXI_B.length})`);
      return;
    }

    if (!tossWonBy) {
      setError('Please select the toss winner.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.put(`/matches/${matchId}/setup-ready`, {
        playingXIA: selectedXI_A,
        playingXIB: selectedXI_B,
        toss: {
          wonBy: tossWonBy,
          decision: tossDecision
        }
      });

      if (response.data.success) {
        router.push(`/matches/${matchId}/dashboard`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to submit match setup');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
      </div>
    );
  }

  if (error || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center border-red-500/20">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'Could not load setup details'}</p>
          <button
            onClick={() => router.back()}
            className="py-2.5 px-6 rounded-lg bg-[#66fcf1] text-[#0b0c10] font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check Permissions: Match Tournament Organizer or Admin
  let matchOrganizerId = '';
  if (match.tournament && typeof match.tournament.organizer === 'object') {
    matchOrganizerId = match.tournament.organizer._id;
  } else if (match.tournament && typeof match.tournament.organizer === 'string') {
    matchOrganizerId = match.tournament.organizer;
  }

  const isOrganizer =
    user && (user.role === 'admin' || user._id === matchOrganizerId);

  // If not organizer, redirect to view-only live room
  if (isAuthenticated && !isOrganizer) {
    router.replace(`/matches/${matchId}`);
    return null;
  }

  const teamAPlayers = match.teamA.players || [];
  const teamBPlayers = match.teamB.players || [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-5xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push(`/matches/${matchId}/dashboard`)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wider">Cancel & Return</span>
              </button>

              <div className="flex items-center space-x-2 text-yellow-500 font-bold uppercase tracking-widest text-xs">
                <Trophy className="w-4 h-4" />
                <span>{match.tournament?.name || 'Tournament'}</span>
              </div>
            </div>

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Match Roster & Toss Setup</h1>
              <p className="text-[#66fcf1] font-bold text-sm mt-1.5 uppercase tracking-wide">
                {match.teamA.name} vs {match.teamB.name}
              </p>
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/25 p-4 rounded-xl mb-6 flex items-center space-x-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Toss Selection Card */}
              <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-3 flex items-center space-x-2">
                  <Coins className="w-4 h-4" />
                  <span>Toss Ceremony Setup</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Toss Winner</label>
                    <select
                      required
                      value={tossWonBy}
                      onChange={(e) => setTossWonBy(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition font-bold"
                    >
                      <option value={match.teamA._id}>{match.teamA.name}</option>
                      <option value={match.teamB._id}>{match.teamB.name}</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Decision</label>
                    <select
                      required
                      value={tossDecision}
                      onChange={(e) => setTossDecision(e.target.value as 'Batting' | 'Bowling')}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition font-bold"
                    >
                      <option value="Batting">BATTING</option>
                      <option value="Bowling">FIELDING / BOWLING</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Roster Pickers Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Team A Roster Selection */}
                <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4 flex flex-col">
                  <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">
                      {match.teamA.name} Playing XI
                    </h3>
                    <span className={`text-xs font-mono font-bold ${selectedXI_A.length === selectedXI_B.length && selectedXI_A.length >= 2 ? 'text-[#39ff14]' : 'text-yellow-500'}`}>
                      {selectedXI_A.length} SELECTED
                    </span>
                  </div>

                  {teamAPlayers.length < 2 && (
                    <div className="bg-yellow-950/20 border border-red-500/25 p-3 rounded-lg text-red-500 text-[10px] uppercase font-bold text-center">
                      Squad needs at least 2 players to play a match.
                    </div>
                  )}

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                    {teamAPlayers.map((player) => {
                      const isSelected = selectedXI_A.includes(player._id);
                      return (
                        <div
                          key={player._id}
                          onClick={() => togglePlayerA(player._id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between select-none ${
                            isSelected 
                              ? 'border-[#66fcf1]/30 bg-[#66fcf1]/5 text-white' 
                              : 'border-white/5 bg-[#1f2833]/15 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-[#66fcf1]" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-600" />
                            )}
                            <div>
                              <p className="font-extrabold text-sm uppercase tracking-wide">{player.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-medium">{player.role}</p>
                            </div>
                          </div>
                          {player.battingStyle && (
                            <span className="text-[9px] font-bold font-mono text-gray-600 uppercase">
                              {player.battingStyle.replace('-hand', '')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {teamAPlayers.length === 0 && (
                      <p className="text-gray-500 text-xs italic text-center py-6">No players in squad.</p>
                    )}
                  </div>
                </div>

                {/* Team B Roster Selection */}
                <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4 flex flex-col">
                  <div className="border-b border-white/5 pb-3 flex justify-between items-center">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">
                      {match.teamB.name} Playing XI
                    </h3>
                    <span className={`text-xs font-mono font-bold ${selectedXI_B.length === selectedXI_A.length && selectedXI_B.length >= 2 ? 'text-[#39ff14]' : 'text-yellow-500'}`}>
                      {selectedXI_B.length} SELECTED
                    </span>
                  </div>

                  {teamBPlayers.length < 2 && (
                    <div className="bg-yellow-950/20 border border-red-500/25 p-3 rounded-lg text-red-500 text-[10px] uppercase font-bold text-center">
                      Squad needs at least 2 players to play a match.
                    </div>
                  )}

                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                    {teamBPlayers.map((player) => {
                      const isSelected = selectedXI_B.includes(player._id);
                      return (
                        <div
                          key={player._id}
                          onClick={() => togglePlayerB(player._id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between select-none ${
                            isSelected 
                              ? 'border-[#66fcf1]/30 bg-[#66fcf1]/5 text-white' 
                              : 'border-white/5 bg-[#1f2833]/15 text-gray-400 hover:border-white/10 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5 text-[#66fcf1]" />
                            ) : (
                              <Square className="w-5 h-5 text-gray-600" />
                            )}
                            <div>
                              <p className="font-extrabold text-sm uppercase tracking-wide">{player.name}</p>
                              <p className="text-[10px] text-gray-500 uppercase font-medium">{player.role}</p>
                            </div>
                          </div>
                          {player.battingStyle && (
                            <span className="text-[9px] font-bold font-mono text-gray-600 uppercase">
                              {player.battingStyle.replace('-hand', '')}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {teamBPlayers.length === 0 && (
                      <p className="text-gray-500 text-xs italic text-center py-6">No players in squad.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="glass-card p-6 border-white/5 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push(`/matches/${matchId}/dashboard`)}
                  className="px-6 py-2.5 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedXI_A.length < 2 || selectedXI_B.length < 2 || selectedXI_A.length !== selectedXI_B.length}
                  className="px-6 py-2.5 bg-[#66fcf1] hover:bg-cyan-400 disabled:opacity-40 disabled:pointer-events-none text-[#0b0c10] text-xs font-black uppercase rounded-xl tracking-wider transition flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>SAVING CONFIG...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SAVE & SET READY</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
