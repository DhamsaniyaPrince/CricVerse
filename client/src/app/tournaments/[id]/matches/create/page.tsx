'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { Trophy, ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';

interface Team {
  _id: string;
  name: string;
  logo?: string;
}

interface Tournament {
  _id: string;
  name: string;
  organizer: { _id: string; username: string };
  teams: Team[];
}

export default function CreateMatchPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;
  const { user } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [matchName, setMatchName] = useState('');
  const [teamAId, setTeamAId] = useState('');
  const [teamBId, setTeamBId] = useState('');
  const [venue, setVenue] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [overs, setOvers] = useState(20);
  const [round, setRound] = useState(1);

  useEffect(() => {
    const fetchTournamentDetails = async () => {
      try {
        const response = await api.get(`/tournaments/${tournamentId}`);
        if (response.data.success) {
          const data = response.data.data;
          setTournament(data);
          
          // Prefill default venue from tournament location
          setVenue(data.location || 'CricVerse Ground');
          
          // Set default match name
          setMatchName(`${data.name} Fixture`);
        }
      } catch (err: any) {
        console.error(err);
        setError('Failed to load tournament registered teams');
      } finally {
        setIsLoading(false);
      }
    };

    if (tournamentId) {
      fetchTournamentDetails();
    }
  }, [tournamentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!teamAId || !teamBId) {
      setError('Please select both Team A and Team B');
      return;
    }

    if (teamAId === teamBId) {
      setError('Team A and Team B cannot be the same team');
      return;
    }

    if (overs <= 0 || overs > 100) {
      setError('Overs must be between 1 and 100');
      return;
    }

    setSubmitting(true);

    try {
      // Merge date and time into a single Date object if possible
      let combinedDate = new Date();
      if (matchDate) {
        const dateStr = matchTime ? `${matchDate}T${matchTime}` : matchDate;
        combinedDate = new Date(dateStr);
      }

      const payload = {
        tournamentId,
        teamAId,
        teamBId,
        matchName,
        venue,
        date: combinedDate.toISOString(),
        overs,
        round
      };

      const response = await api.post('/matches', payload);
      if (response.data.success) {
        router.push(`/tournaments/${tournamentId}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  // Check Permissions
  const canCreate =
    tournament &&
    user &&
    (user.role === 'admin' || tournament.organizer?._id === user._id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
      </div>
    );
  }

  if (error && !tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center border-red-500/20">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Error Loading Page</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
            className="py-2.5 px-6 rounded-lg bg-[#66fcf1] text-[#0b0c10] font-bold"
          >
            Back to Tournament
          </button>
        </div>
      </div>
    );
  }

  if (tournament && !canCreate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center border-red-500/20">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-500 text-sm mb-6">Only the tournament Organizer or CricVerse Admin can create matches.</p>
          <button
            onClick={() => router.push(`/tournaments/${tournamentId}`)}
            className="py-2.5 px-6 rounded-lg bg-[#66fcf1] text-[#0b0c10] font-bold"
          >
            Back to Tournament
          </button>
        </div>
      </div>
    );
  }

  const registeredTeams = tournament?.teams || [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-3xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => router.push(`/tournaments/${tournamentId}`)}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wider">Back</span>
              </button>

              <div className="flex items-center space-x-2 text-yellow-500 font-bold uppercase tracking-widest text-xs">
                <Trophy className="w-4 h-4" />
                <span>{tournament?.name}</span>
              </div>
            </div>

            {/* Title */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">Schedule New Match</h1>
              <p className="text-gray-500 text-xs mt-1">Configure match rosters, venue, date, and overs limit.</p>
            </div>

            {error && (
              <div className="bg-red-950/20 border border-red-500/25 p-4 rounded-xl mb-6 flex items-center space-x-3 text-red-400 text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
              {/* Row 1: Tournament Display Only */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Tournament</label>
                <input
                  type="text"
                  disabled
                  value={tournament?.name || ''}
                  className="w-full bg-[#1f2833]/45 border border-white/5 rounded-lg py-2.5 px-3 text-sm text-gray-400 font-bold"
                />
              </div>

              {/* Row 2: Match Name */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Match Name / Round Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. League Match 15, Quarter Final 2"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                />
              </div>

              {/* Row 3: Team A & Team B Dropdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Team A (Home)</label>
                  <select
                    required
                    value={teamAId}
                    onChange={(e) => setTeamAId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  >
                    <option value="">Select Team A</option>
                    {registeredTeams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Team B (Away)</label>
                  <select
                    required
                    value={teamBId}
                    onChange={(e) => setTeamBId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  >
                    <option value="">Select Team B</option>
                    {registeredTeams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 4: Ground/Venue */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Ground / Venue</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lords Cricket Ground"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                />
              </div>

              {/* Row 5: Date and Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Match Date</label>
                  <input
                    type="date"
                    required
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Match Time</label>
                  <input
                    type="time"
                    required
                    value={matchTime}
                    onChange={(e) => setMatchTime(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  />
                </div>
              </div>

              {/* Row 6: Overs and Round */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Number of Overs</label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={100}
                    value={overs}
                    onChange={(e) => setOvers(Number(e.target.value))}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Tournament Round</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={round}
                    onChange={(e) => setRound(Number(e.target.value))}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1] transition"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="border-t border-white/5 pt-6 flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => router.push(`/tournaments/${tournamentId}`)}
                  className="px-6 py-2.5 border border-white/10 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-[#66fcf1] hover:bg-cyan-400 disabled:opacity-50 text-[#0b0c10] text-xs font-black uppercase rounded-xl tracking-wider transition flex items-center space-x-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>SCHEDULING...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>SCHEDULE MATCH</span>
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
