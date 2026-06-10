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
  ArrowLeft, Calendar, MapPin, Radio, Shield, Settings, Play, XCircle, RefreshCw, AlertCircle, Users
} from 'lucide-react';

interface Player {
  _id: string;
  name: string;
}

interface Match {
  _id: string;
  title: string;
  venue: string;
  date?: string;
  overs?: number;
  oversCount?: number;
  status: 'Scheduled' | 'Ready' | 'Live' | 'Completed' | 'Cancelled' | 'Upcoming';
  teamA: { _id: string; name: string; logo?: string };
  teamB: { _id: string; name: string; logo?: string };
  tournament?: {
    _id: string;
    name: string;
    organizer: { _id: string; username: string } | string;
  };
  playingXIA?: Player[];
  playingXIB?: Player[];
}

export default function MatchDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const matchId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchMatchDetails = async () => {
    try {
      const response = await api.get(`/matches/${matchId}`);
      if (response.data.success) {
        setMatch(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not retrieve match details.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  const handleCancelMatch = async () => {
    const confirm = window.confirm('Are you sure you want to CANCEL this match? This action is permanent.');
    if (!confirm) return;

    setProcessing(true);
    try {
      const response = await api.put(`/matches/${matchId}`, { status: 'Cancelled' });
      if (response.data.success) {
        alert('Match cancelled successfully!');
        fetchMatchDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel match');
    } finally {
      setProcessing(false);
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
          <h2 className="text-xl font-bold text-white mb-2">Match Not Found</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'The requested match does not exist'}</p>
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

  const matchOvers = match.overs !== undefined ? match.overs : (match.oversCount ?? 20);
  const matchDateFormatted = match.date ? new Date(match.date).toLocaleDateString() : 'TBD';
  const matchTimeFormatted = match.date ? new Date(match.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBD';

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => {
                  if (match.tournament?._id) {
                    router.push(`/tournaments/${match.tournament._id}`);
                  } else {
                    router.push('/tournaments');
                  }
                }}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm font-bold uppercase tracking-wider">Tournament Desk</span>
              </button>

              <div className="flex items-center space-x-2 text-[#66fcf1] font-bold uppercase tracking-widest text-xs">
                <Shield className="w-4 h-4" />
                <span>Match Management</span>
              </div>
            </div>

            {/* Match Card Overview */}
            <div className="glass-card p-6 md:p-8 border-[#66fcf1]/10 mb-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-44 h-44 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/5 pb-6 mb-6">
                <div>
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] block mb-1">
                    {match.tournament?.name || 'CricVerse Tournament'}
                  </span>
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">{match.title}</h1>
                </div>

                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Status</span>
                  <span className={`text-xs font-black uppercase px-4 py-1.5 rounded-full border ${
                    match.status === 'Live' ? 'text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/5' :
                    match.status === 'Ready' ? 'text-[#66fcf1] border-[#66fcf1]/30 bg-[#66fcf1]/5' :
                    match.status === 'Completed' ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5' :
                    match.status === 'Cancelled' ? 'text-red-500 border-red-500/30 bg-red-500/5' :
                    'text-gray-400 border-gray-500/25 bg-gray-500/5'
                  }`}>
                    {match.status}
                  </span>
                </div>
              </div>

              {/* Match Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-sm">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-300">
                    <MapPin className="w-5 h-5 text-gray-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Ground Venue</span>
                      <span className="font-semibold text-white">{match.venue}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-gray-300">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Date & Time</span>
                      <span className="font-semibold text-white">{matchDateFormatted} @ {matchTimeFormatted}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-gray-300">
                    <Radio className="w-5 h-5 text-gray-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Overs Limit</span>
                      <span className="font-semibold text-white">{matchOvers} Overs</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-gray-300">
                    <Users className="w-5 h-5 text-gray-500" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">Playing XI Rosters</span>
                      <span className="font-semibold text-white">
                        {match.playingXIA?.length === 11 && match.playingXIB?.length === 11 ? (
                          <span className="text-[#39ff14]">CONFIGURED (11 vs 11)</span>
                        ) : (
                          <span className="text-yellow-500">PENDING SETUP</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Match Teams Showcase */}
              <div className="bg-[#1f2833]/20 border border-white/5 rounded-2xl p-6 flex items-center justify-around text-center gap-6">
                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-[#1f2833] border border-white/10 flex items-center justify-center font-bold text-white text-2xl mx-auto overflow-hidden">
                    {match.teamA.logo ? (
                      <img src={match.teamA.logo} alt={match.teamA.name} className="w-full h-full object-cover" />
                    ) : (
                      match.teamA.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="font-black text-white text-base uppercase tracking-wider">{match.teamA.name}</h3>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Home</span>
                </div>

                <div className="font-mono text-xl font-bold text-gray-600">VS</div>

                <div className="space-y-2">
                  <div className="w-16 h-16 rounded-3xl bg-[#1f2833] border border-white/10 flex items-center justify-center font-bold text-white text-2xl mx-auto overflow-hidden">
                    {match.teamB.logo ? (
                      <img src={match.teamB.logo} alt={match.teamB.name} className="w-full h-full object-cover" />
                    ) : (
                      match.teamB.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="font-black text-white text-base uppercase tracking-wider">{match.teamB.name}</h3>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Away</span>
                </div>
              </div>
            </div>

            {/* Actions Dashboard Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Setup Match */}
              <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-cyan-950/40 border border-[#66fcf1]/30 flex items-center justify-center mb-4">
                    <Settings className="w-5 h-5 text-[#66fcf1]" />
                  </div>
                  <h3 className="text-white font-extrabold text-base tracking-wide uppercase">Setup Match</h3>
                  <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                    Select exactly 11 players for each team's Playing XI and enter the match toss results.
                  </p>
                </div>
                
                <button
                  disabled={match.status === 'Completed' || match.status === 'Cancelled' || match.status === 'Live'}
                  onClick={() => router.push(`/matches/${matchId}/setup`)}
                  className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-[#0b0c10] text-xs font-black uppercase rounded-lg tracking-wider transition font-extrabold text-center"
                >
                  Configure Roster
                </button>
              </div>

              {/* Card 2: Start Match */}
              <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-green-950/40 border border-green-500/30 flex items-center justify-center mb-4">
                    <Play className="w-5 h-5 text-[#39ff14]" />
                  </div>
                  <h3 className="text-white font-extrabold text-base tracking-wide uppercase">Start Scoring</h3>
                  <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                    {match.status === 'Live' ? 'The match is currently live! Access the scorer keypad to record ball entries.' :
                     match.status === 'Ready' ? 'Rosters configured! Proceed to select the opening striker, non-striker, bowler and start scoring.' :
                     'Requires Playing XI and Toss details configured first. Click Setup Match.'}
                  </p>
                </div>
                
                {match.status === 'Live' ? (
                  <button
                    onClick={() => router.push(`/admin?matchId=${matchId}`)}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-[#39ff14] text-[#0b0c10] text-xs font-black uppercase rounded-lg tracking-wider transition text-center"
                  >
                    Go to Scorer
                  </button>
                ) : (
                  <button
                    disabled={match.status !== 'Ready'}
                    onClick={() => router.push(`/admin?matchId=${matchId}`)}
                    className="w-full py-2.5 bg-gradient-to-r from-[#66fcf1] to-cyan-400 disabled:opacity-30 disabled:pointer-events-none text-[#0b0c10] text-xs font-black uppercase rounded-lg tracking-wider transition text-center"
                  >
                    Start Match
                  </button>
                )}
              </div>

              {/* Card 3: Cancel Match */}
              <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between space-y-4">
                <div>
                  <div className="w-10 h-10 rounded-xl bg-red-950/40 border border-red-500/30 flex items-center justify-center mb-4">
                    <XCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <h3 className="text-white font-extrabold text-base tracking-wide uppercase">Cancel Match</h3>
                  <p className="text-gray-500 text-xs mt-1.5 leading-relaxed">
                    Cancel this match. This updates the status to Cancelled. Live scorecards are halted.
                  </p>
                </div>
                
                <button
                  disabled={match.status === 'Completed' || match.status === 'Cancelled' || processing}
                  onClick={handleCancelMatch}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-black uppercase rounded-lg tracking-wider transition text-center"
                >
                  Cancel Match
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
