'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Plus,
  Users,
  LayoutList,
  CalendarRange,
  Award,
  RefreshCw,
  Settings,
  Shield,
  MapPin,
  DollarSign,
  Check,
  X,
  FileText,
  AlertTriangle,
  Play
} from 'lucide-react';

interface PointTableEntry {
  team: { _id: string; name: string; logo?: string };
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
}

interface Fixture {
  _id: string;
  match: {
    _id: string;
    title: string;
    teamA: { _id: string; name: string };
    teamB: { _id: string; name: string };
    status: string;
    score: {
      teamA: { runs: number; wickets: number; overs: number };
      teamB: { runs: number; wickets: number; overs: number };
    };
    result?: { winner?: { name: string }; margin?: string };
    venue?: string;
  };
  round: number;
  scheduledDate: string;
  venue: string;
}

interface LeaderboardStats {
  batsmen: { name: string; runs: number }[];
  bowlers: { name: string; wickets: number }[];
}

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  location: string;
  logo: string;
  startDate: string;
  endDate: string;
  status: string;
  format: 'League' | 'Knockout';
  maxTeams: number;
  entryFee: number;
  organizer: { _id: string; username: string; email: string };
  teams: { _id: string; name: string; logo?: string; owner: string }[];
  pointsTable: PointTableEntry[];
  fixtures: Fixture[];
}

interface RegistrationRequest {
  _id: string;
  team: { _id: string; name: string; logo?: string };
  captain: { username: string; email: string };
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
}

interface UserTeam {
  _id: string;
  name: string;
  logo?: string;
}

export default function TournamentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tournamentId = params?.id as string;
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardStats>({ batsmen: [], bowlers: [] });
  const [registrations, setRegistrations] = useState<RegistrationRequest[]>([]);
  const [myTeams, setMyTeams] = useState<UserTeam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'squads' | 'standings' | 'fixtures' | 'leaderboard' | 'manage'>('overview');

  // Modal / Request State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [registering, setRegistering] = useState(false);

  // Management panel states
  const [fixturesLoading, setFixturesLoading] = useState(false);
  const [scheduleMatchId, setScheduleMatchId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleVenue, setScheduleVenue] = useState('');
  const [scheduling, setScheduling] = useState(false);
  const [processingRegId, setProcessingRegId] = useState<string | null>(null);

  const fetchTournamentDetails = async () => {
    try {
      const response = await api.get(`/tournaments/${tournamentId}`);
      if (response.data.success) {
        setTournament(response.data.data);
      }

      // Fetch leaderboard stats
      const lbResponse = await api.get(`/tournaments/${tournamentId}/leaderboard`);
      if (lbResponse.data.success) {
        setLeaderboard(lbResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching tournament details:', err);
    }
  };

  const fetchRegistrations = async () => {
    // Only load if authorized (organizer or admin)
    if (!tournament) return;
    const canManage = isAuthenticated && user && (user.role === 'admin' || tournament.organizer?._id === user._id);
    if (!canManage) return;

    try {
      const response = await api.get(`/tournaments/${tournamentId}/registrations`);
      if (response.data.success) {
        setRegistrations(response.data.data);
      }
    } catch (err) {
      console.error('Error loading registration requests:', err);
    }
  };

  const fetchMyTeams = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const response = await api.get('/teams/managed');
      if (response.data.success) {
        setMyTeams(response.data.data);
        if (response.data.data.length > 0) {
          setSelectedTeamId(response.data.data[0]._id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    await fetchTournamentDetails();
    await fetchMyTeams();
    setIsLoading(false);
  };

  useEffect(() => {
    if (tournamentId) loadData();
  }, [tournamentId]);

  useEffect(() => {
    if (activeTab === 'manage') {
      fetchRegistrations();
    }
  }, [activeTab, tournament]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) return;

    setRegistering(true);
    try {
      const response = await api.post(`/tournaments/${tournamentId}/register`, { teamId: selectedTeamId });
      if (response.data.success) {
        alert(response.data.message || 'Registration request sent successfully!');
        setShowRegisterModal(false);
        fetchTournamentDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not register team');
    } finally {
      setRegistering(false);
    }
  };

  const handleProcessRegistration = async (regId: string, status: 'Approved' | 'Rejected') => {
    setProcessingRegId(regId);
    try {
      const response = await api.put(`/tournaments/${tournamentId}/registrations/${regId}`, { status });
      if (response.data.success) {
        alert(response.data.message);
        fetchRegistrations();
        fetchTournamentDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update request');
    } finally {
      setProcessingRegId(null);
    }
  };

  const handleGenerateFixtures = async () => {
    const confirm = window.confirm('Generating fixtures will delete any existing scheduled matches for this tournament. Proceed?');
    if (!confirm) return;

    setFixturesLoading(true);
    try {
      const response = await api.post(`/tournaments/${tournamentId}/fixtures`);
      if (response.data.success) {
        alert('Fixtures generated successfully! The league is now live.');
        fetchTournamentDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate fixtures');
    } finally {
      setFixturesLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleMatchId || !scheduleDate || !scheduleVenue) return;

    setScheduling(true);
    try {
      const response = await api.put(`/tournaments/${tournamentId}/schedule`, {
        matchId: scheduleMatchId,
        scheduledDate: scheduleDate,
        venue: scheduleVenue
      });
      if (response.data.success) {
        alert('Match scheduled successfully!');
        setScheduleMatchId('');
        setScheduleDate('');
        setScheduleVenue('');
        fetchTournamentDetails();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to schedule match');
    } finally {
      setScheduling(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center p-8 glass-card max-w-sm">
          <Trophy className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">Tournament Not Found</h2>
          <button onClick={() => router.push('/tournaments')} className="px-4 py-2 bg-[#66fcf1] text-[#0b0c10] font-bold rounded">
            Back to Tournaments
          </button>
        </div>
      </div>
    );
  }

  // Permission Checks
  const isOrganizer = isAuthenticated && user && (user.role === 'admin' || tournament.organizer?._id === user._id);
  const isCaptain = isAuthenticated && user && (user.role === 'captain' || user.role === 'admin' || myTeams.length > 0);
  const registeredCount = tournament.teams?.length || 0;
  const capacityPercentage = Math.min(100, Math.round((registeredCount / tournament.maxTeams) * 100));

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Top Banner Card */}
          <div className="glass-card mb-8 border-[#66fcf1]/10 overflow-hidden relative">
            <div className="h-44 w-full relative overflow-hidden">
              <img src={tournament.logo} alt={tournament.name} className="w-full h-full object-cover brightness-[0.4]" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10] to-transparent"></div>
            </div>

            <div className="p-6 md:p-8 -mt-12 relative flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center space-x-2.5">
                  <Trophy className="w-8 h-8 text-yellow-500" />
                  <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">{tournament.name}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4 text-[#66fcf1]" />
                    <span>
                      {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}
                    </span>
                  </span>
                  <span>|</span>
                  <span className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-[#66fcf1]" />
                    <span>{tournament.location}</span>
                  </span>
                  <span>|</span>
                  <span className="text-[#66fcf1] font-bold uppercase">{tournament.format} FORMAT</span>
                </div>
              </div>

              <span className="self-start md:self-auto bg-gradient-to-r from-yellow-500/10 to-yellow-600/15 border border-yellow-500/30 text-yellow-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-widest animate-pulse">
                {tournament.status}
              </span>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <button
              onClick={() => setActiveTab('overview')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'overview' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('squads')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'squads' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Squads ({registeredCount})
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'standings' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Standings Points
            </button>
            <button
              onClick={() => setActiveTab('fixtures')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'fixtures' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Matches ({tournament.fixtures?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                activeTab === 'leaderboard' ? 'border-[#66fcf1] text-[#66fcf1]' : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Leaderboard
            </button>
            {isOrganizer && (
              <button
                onClick={() => setActiveTab('manage')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 text-[#66fcf1] flex items-center space-x-1.5 ${
                  activeTab === 'manage' ? 'border-[#66fcf1] bg-[#66fcf1]/5' : 'border-transparent hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Organizer Desk</span>
              </button>
            )}
          </div>

          <AnimatePresence mode="wait">
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Details cards */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
                      League Description & Guidelines
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed whitespace-pre-line">
                      {tournament.description || 'No description has been registered for this tournament yet. Reach out to the organizer for league guidelines and rule books.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-card p-5 border-[#66fcf1]/5 text-center">
                      <MapPin className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                      <span className="text-[9px] text-gray-500 font-bold block uppercase">Ground Venue</span>
                      <span className="text-sm font-bold text-white mt-1 block">{tournament.location}</span>
                    </div>

                    <div className="glass-card p-5 border-[#66fcf1]/5 text-center">
                      <DollarSign className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                      <span className="text-[9px] text-gray-500 font-bold block uppercase">Entry Fee</span>
                      <span className="text-sm font-mono font-bold text-[#66fcf1] mt-1 block">
                        {tournament.entryFee > 0 ? `$${tournament.entryFee}` : 'FREE ENTRY'}
                      </span>
                    </div>

                    <div className="glass-card p-5 border-[#66fcf1]/5 text-center">
                      <Users className="w-5 h-5 text-gray-600 mx-auto mb-2" />
                      <span className="text-[9px] text-gray-500 font-bold block uppercase">League Organizer</span>
                      <span className="text-sm font-bold text-white mt-1 block uppercase">{tournament.organizer?.username || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Capacity Card & Registration Call */}
                <div className="space-y-6">
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-5">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-3">
                      League Capacity
                    </h3>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Registered Teams</span>
                        <span className="text-white font-bold font-mono">
                          {registeredCount} / {tournament.maxTeams}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-[#66fcf1] transition-all duration-300"
                          style={{ width: `${capacityPercentage}%` }}
                        ></div>
                      </div>
                    </div>

                    {tournament.status === 'Upcoming' && (
                      <div className="pt-2">
                        {isCaptain ? (
                          <button
                            onClick={() => setShowRegisterModal(true)}
                            disabled={registeredCount >= tournament.maxTeams}
                            className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-black uppercase rounded-xl tracking-wider transition"
                          >
                            Register My Team
                          </button>
                        ) : (
                          <div className="p-3 bg-yellow-950/20 border border-yellow-500/20 rounded-xl text-yellow-300 text-[10px] uppercase font-bold text-center">
                            Registrations Open to Captains
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Matches Management Card */}
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-3">
                      Matches
                    </h3>
                    <div className="flex flex-col gap-3">
                      {isOrganizer && (
                        <button
                          onClick={() => router.push(`/tournaments/${tournamentId}/matches/create`)}
                          className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-black uppercase rounded-xl tracking-wider transition font-extrabold"
                        >
                          Create Match
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab('fixtures')}
                        className="w-full py-2.5 bg-[#1f2833]/60 hover:bg-[#1f2833]/80 border border-white/10 text-white text-xs font-bold uppercase rounded-xl tracking-wider transition font-bold"
                      >
                        View Matches
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SQUADS TAB */}
            {activeTab === 'squads' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {tournament.teams?.filter(t => t !== null).map((team) => (
                  <div
                    key={team._id}
                    onClick={() => router.push(`/teams/${team._id}`)}
                    className="glass-card p-6 border-white/5 hover:border-[#66fcf1]/30 hover:bg-[#1f2833]/10 cursor-pointer transition duration-300 flex items-center space-x-4"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#1f2833] flex items-center justify-center font-bold text-white text-xl overflow-hidden border border-white/5">
                      {team.logo ? (
                        <img src={team.logo} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        team.name?.charAt(0).toUpperCase() || 'T'
                      )}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-white text-base tracking-wide uppercase">{team.name}</h3>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest block mt-0.5">Click for Squad Roster</span>
                    </div>
                  </div>
                ))}

                {tournament.teams.length === 0 && (
                  <div className="md:col-span-2 lg:col-span-3 glass-card p-12 text-center border-dashed border-[#66fcf1]/20">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-white font-bold">No Squads Registered</h3>
                    <p className="text-gray-500 text-xs mt-1">Captains can apply to register their teams using the Overview tab.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* 3. STANDINGS TAB */}
            {activeTab === 'standings' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="glass-card p-6 border-[#66fcf1]/10"
              >
                <div className="flex items-center space-x-2.5 mb-6">
                  <LayoutList className="w-6 h-6 text-[#66fcf1]" />
                  <h3 className="text-md font-bold text-white uppercase tracking-wider">Tournament Standings</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-400">
                    <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                      <tr>
                        <th className="py-3 px-3">TEAM NAME</th>
                        <th className="py-3 px-3 font-mono text-center">P</th>
                        <th className="py-3 px-3 font-mono text-center">W</th>
                        <th className="py-3 px-3 font-mono text-center">L</th>
                        <th className="py-3 px-3 font-mono text-center">T</th>
                        <th className="py-3 px-3 font-mono text-center">PTS</th>
                        <th className="py-3 px-3 font-mono text-right">NRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tournament.pointsTable
                        ?.filter(row => row && row.team)
                        .sort((a, b) => b.points - a.points || b.nrr - a.nrr)
                        .map((row, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="py-3.5 px-3 font-bold text-white flex items-center space-x-2">
                              <span className="w-5 h-5 rounded bg-gray-800 text-xs flex items-center justify-center font-bold text-gray-400">
                                {idx + 1}
                              </span>
                              <span>{row.team.name}</span>
                            </td>
                            <td className="py-3.5 px-3 font-mono text-center">{row.played}</td>
                            <td className="py-3.5 px-3 font-mono text-center text-emerald-400">{row.won}</td>
                            <td className="py-3.5 px-3 font-mono text-center text-red-400">{row.lost}</td>
                            <td className="py-3.5 px-3 font-mono text-center">{row.tied}</td>
                            <td className="py-3.5 px-3 font-mono font-bold text-[#66fcf1] text-center">{row.points}</td>
                            <td className="py-3.5 px-3 font-mono text-right text-gray-400">
                              {row.nrr > 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                            </td>
                          </tr>
                        ))}
                      {tournament.pointsTable?.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-6 text-center text-gray-600 italic">No standings tables computed</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}

            {/* 4. MATCHES/FIXTURES TAB */}
            {activeTab === 'fixtures' && (() => {
              const fixtures = tournament.fixtures || [];
              const liveMatches = fixtures.filter(f => f.match && f.match.status === 'Live');
              const upcomingMatches = fixtures.filter(f => f.match && (f.match.status === 'Scheduled' || f.match.status === 'Ready' || f.match.status === 'Upcoming'));
              const completedMatches = fixtures.filter(f => f.match && (f.match.status === 'Completed' || f.match.status === 'Cancelled'));

              const renderMatchCard = (fixture: Fixture) => {
                const match = fixture.match;
                if (!match) return null;

                // Status styling
                let statusColor = 'text-gray-400 border-gray-500/25 bg-gray-500/5';
                if (match.status === 'Live') {
                  statusColor = 'text-[#39ff14] border-[#39ff14]/30 bg-[#39ff14]/5';
                } else if (match.status === 'Ready') {
                  statusColor = 'text-[#66fcf1] border-[#66fcf1]/30 bg-[#66fcf1]/5';
                } else if (match.status === 'Completed') {
                  statusColor = 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5';
                } else if (match.status === 'Cancelled') {
                  statusColor = 'text-red-500 border-red-500/30 bg-red-500/5';
                }

                return (
                  <div key={fixture._id} className="glass-card p-6 border-white/5 flex flex-col justify-between space-y-4 hover:border-cyan-500/10 transition relative overflow-hidden">
                    {match.status === 'Live' && (
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#39ff14]/5 rounded-full blur-xl pointer-events-none animate-pulse"></div>
                    )}
                    
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">ROUND {fixture.round}</span>
                        <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${statusColor}`}>
                          {match.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {new Date(fixture.scheduledDate || scheduledDateValue(fixture)).toLocaleDateString()} | {fixture.venue || match.venue}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white font-bold">{match.teamA?.name || 'Team A'}</span>
                        <span className="text-[#66fcf1] font-bold">
                          {match.score?.teamA?.runs ?? 0}/{match.score?.teamA?.wickets ?? 0}
                          <span className="text-[10px] text-gray-500 pl-1 font-medium">({match.score?.teamA?.overs ?? 0} ov)</span>
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-white font-bold">{match.teamB?.name || 'Team B'}</span>
                        <span className="text-[#66fcf1] font-bold">
                          {match.score?.teamB?.runs ?? 0}/{match.score?.teamB?.wickets ?? 0}
                          <span className="text-[10px] text-gray-500 pl-1 font-medium">({match.score?.teamB?.overs ?? 0} ov)</span>
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-3 flex items-center justify-between">
                      <span className="text-xs text-gray-400 font-semibold italic">
                        {match.status === 'Completed' && match.result
                          ? `${match.result.winner?.name || 'Winner'} ${match.result.margin?.toLowerCase().startsWith('won') ? match.result.margin : 'won ' + match.result.margin}`
                          : match.status === 'Cancelled'
                          ? 'Match Cancelled'
                          : `${match.status} Match`}
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        {isOrganizer && (
                          <button
                            onClick={() => router.push(`/matches/${match._id}/dashboard`)}
                            className="py-1 px-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black rounded text-xs transition uppercase"
                          >
                            Manage
                          </button>
                        )}
                        <button
                          onClick={() => router.push(`/matches/${match._id}`)}
                          className="py-1 px-3 bg-[#1f2833]/80 border border-white/10 hover:bg-[#1f2833] text-white font-bold rounded text-xs transition uppercase"
                        >
                          Live Room
                        </button>
                      </div>
                    </div>
                  </div>
                );
              };

              function scheduledDateValue(f: any) {
                return f.scheduledDate || (f.match && f.match.date) || new Date();
              }

              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-8"
                >
                  <div className="flex items-center space-x-2.5 mb-2">
                    <CalendarRange className="w-6 h-6 text-[#66fcf1]" />
                    <h3 className="text-md font-bold text-white uppercase tracking-wider">Tournament Matches</h3>
                  </div>

                  {/* 1. Live Matches */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#39ff14] flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse"></span>
                      <span>Live Matches ({liveMatches.length})</span>
                    </h4>
                    {liveMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {liveMatches.map(renderMatchCard)}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic pl-4">No matches are currently live.</p>
                    )}
                  </div>

                  {/* 2. Upcoming Matches */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-[#66fcf1]"></span>
                      <span>Upcoming Matches ({upcomingMatches.length})</span>
                    </h4>
                    {upcomingMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {upcomingMatches.map(renderMatchCard)}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic pl-4">No upcoming matches scheduled.</p>
                    )}
                  </div>

                  {/* 3. Completed Matches */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-gray-400 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                      <span>Completed & Cancelled ({completedMatches.length})</span>
                    </h4>
                    {completedMatches.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {completedMatches.map(renderMatchCard)}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs italic pl-4">No completed matches yet.</p>
                    )}
                  </div>

                  {fixtures.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center py-10">No matches have been created for this tournament yet.</p>
                  )}
                </motion.div>
              );
            })()}

            {/* 5. LEADERBOARD TAB */}
            {activeTab === 'leaderboard' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8"
              >
                {/* Top Batsmen */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <div className="flex items-center space-x-2 mb-6">
                    <Award className="w-5 h-5 text-yellow-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Tournament Batsmen</h3>
                  </div>

                  <div className="space-y-4">
                    {leaderboard.batsmen.map((player, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 text-sm">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-gray-500">{i + 1}</span>
                          <span className="font-bold text-white">{player.name}</span>
                        </div>
                        <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded text-xs">
                          {player.runs} Runs
                        </span>
                      </div>
                    ))}
                    {leaderboard.batsmen.length === 0 && (
                      <p className="text-gray-500 text-xs italic">No statistics recorded yet</p>
                    )}
                  </div>
                </div>

                {/* Top Bowlers */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <div className="flex items-center space-x-2 mb-6">
                    <Award className="w-5 h-5 text-pink-500" />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Tournament Bowlers</h3>
                  </div>

                  <div className="space-y-4">
                    {leaderboard.bowlers.map((player, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3 text-sm">
                        <div className="flex items-center space-x-3">
                          <span className="font-mono font-bold text-gray-500">{i + 1}</span>
                          <span className="font-bold text-white">{player.name}</span>
                        </div>
                        <span className="font-mono text-pink-400 font-bold bg-pink-500/10 px-2 py-0.5 rounded text-xs">
                          {player.wickets} Wkts
                        </span>
                      </div>
                    ))}
                    {leaderboard.bowlers.length === 0 && (
                      <p className="text-gray-500 text-xs italic">No statistics recorded yet</p>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 6. ORGANIZER DESK TAB */}
            {activeTab === 'manage' && isOrganizer && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Registrations Requests Board */}
                <div className="glass-card p-6 border-yellow-500/10 space-y-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-white/5 pb-3">
                    Team Registration Requests
                  </h3>
                  
                  <div className="space-y-4">
                    {registrations.filter(r => r && r.team).map((reg) => (
                      <div key={reg._id} className="p-4 rounded-xl border border-white/5 bg-[#0b0c10]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-900 border border-white/5 rounded-xl flex items-center justify-center font-bold text-white">
                            {reg.team.logo ? <img src={reg.team.logo} alt={reg.team.name} className="w-full h-full object-cover" /> : reg.team.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-white block uppercase text-sm">{reg.team.name}</span>
                            <span className="text-[10px] text-gray-500 block">Submitted by captain: {reg.captain?.username}</span>
                          </div>
                        </div>

                        {reg.status === 'Pending' ? (
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleProcessRegistration(reg._id, 'Approved')}
                              disabled={processingRegId === reg._id}
                              className="px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold text-[10px] uppercase transition flex items-center space-x-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleProcessRegistration(reg._id, 'Rejected')}
                              disabled={processingRegId === reg._id}
                              className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-500/30 hover:bg-red-950 text-red-400 font-bold text-[10px] uppercase transition flex items-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-bold uppercase ${reg.status === 'Approved' ? 'text-green-400' : 'text-red-400'}`}>
                            {reg.status}
                          </span>
                        )}
                      </div>
                    ))}

                    {registrations.length === 0 && (
                      <p className="text-gray-500 text-xs italic text-center py-6">No team registration requests submitted</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Fixtures Generator Card */}
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                      <Shield className="w-5 h-5 text-[#66fcf1]" />
                      <span>Fixture Generator</span>
                    </h3>
                    <p className="text-gray-500 text-xs">
                      Automatically generate round-robin match sheets for all {registeredCount} registered teams.
                    </p>

                    <button
                      onClick={handleGenerateFixtures}
                      disabled={fixturesLoading || registeredCount < 2}
                      className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-gray-900 font-bold rounded-lg hover:from-yellow-400 hover:to-yellow-500 transition text-xs uppercase disabled:opacity-50"
                    >
                      {fixturesLoading ? 'GENERATING MATCH SHEETS...' : 'GENERATE ROUND-ROBIN FIXTURES'}
                    </button>
                    {registeredCount < 2 && (
                      <p className="text-yellow-500 text-[10px] uppercase font-bold text-center">Requires at least 2 approved teams</p>
                    )}
                  </div>

                  {/* Match Scheduler Card */}
                  {tournament.fixtures?.length > 0 && (
                    <div className="lg:col-span-2 glass-card p-6 border-[#66fcf1]/10 space-y-4">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center space-x-2">
                        <Settings className="w-5 h-5 text-[#66fcf1]" />
                        <span>Match Scheduling Panel</span>
                      </h3>
                      
                      <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select Fixture</label>
                          <select
                            value={scheduleMatchId}
                            onChange={(e) => setScheduleMatchId(e.target.value)}
                            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white"
                          >
                            <option value="">Select Match</option>
                            {tournament.fixtures.map(f => (
                              <option key={f.match._id} value={f.match._id}>{f.match.title}</option>
                            ))}
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Venue</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Lords Cricket Ground"
                            value={scheduleVenue}
                            onChange={(e) => setScheduleVenue(e.target.value)}
                            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Date</label>
                          <input
                            type="date"
                            required
                            value={scheduleDate}
                            onChange={(e) => setScheduleDate(e.target.value)}
                            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white focus:outline-none"
                          />
                        </div>
                        
                        <div className="flex flex-col justify-end">
                          <button
                            type="submit"
                            disabled={scheduling || !scheduleMatchId}
                            className="w-full py-2.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold rounded-lg transition disabled:opacity-50 text-xs"
                          >
                            {scheduling ? 'SCHEDULING...' : 'SCHEDULE FIXTURE'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* TEAM REGISTRATION MODAL */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
          <div className="glass-card max-w-md w-full p-6 space-y-6 relative border-cyan-500/20">
            <button
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Users className="w-6 h-6 text-[#66fcf1]" />
                <span>Register Team</span>
              </h2>
              <p className="text-gray-400 text-xs mt-1">
                Select one of your squads to join the {tournament.name}.
              </p>
            </div>

            {myTeams.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-yellow-950/20 border border-yellow-500/20 text-yellow-300 text-xs flex items-start space-x-2">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-yellow-500" />
                  <span>You do not own any teams yet. Create a team first to register!</span>
                </div>
                <button
                  onClick={() => router.push('/teams')}
                  className="w-full py-2 bg-gradient-to-r from-cyan-600 to-[#66fcf1] text-[#0b0c10] font-bold text-xs uppercase rounded"
                >
                  Go to Teams
                </button>
              </div>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select Squad</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white"
                  >
                    {myTeams.map(team => (
                      <option key={team._id} value={team._id}>{team.name}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={registering}
                  className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold text-xs uppercase rounded-lg tracking-wide transition flex items-center justify-center space-x-2"
                >
                  {registering ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <span>Submit Registration Request</span>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
