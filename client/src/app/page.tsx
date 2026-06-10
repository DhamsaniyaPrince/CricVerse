'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { Match } from '@/store/slices/matchSlice';
import { Activity, Trophy, Play, CheckCircle, Database, ChevronRight, Award, Plus, Calendar, AlertCircle } from 'lucide-react';

import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [standings, setStandings] = useState<any[]>([]);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHost = mounted && isAuthenticated && user && (user.role === 'admin' || user.role === 'organizer');

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/matches');
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (err: any) {
      console.error('Error fetching matches:', err);
      setError(err.response?.data?.message || 'Failed to load match streams. Make sure the backend is active.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStandingsAndPerformers = async () => {
    try {
      const tournResponse = await api.get('/tournaments');
      if (tournResponse.data.success && tournResponse.data.data.length > 0) {
        const activeTourn = tournResponse.data.data.find((t: any) => t.status === 'Live') || tournResponse.data.data[0];
         if (activeTourn && activeTourn.pointsTable) {
          const sortedTable = [...activeTourn.pointsTable]
            .filter((row: any) => row && row.team)
            .sort((a: any, b: any) => {
              if (b.points !== a.points) return b.points - a.points;
              return (b.nrr || 0) - (a.nrr || 0);
            });
          setStandings(sortedTable);
        }
      }
      
      const leaderResponse = await api.get('/leaderboard?type=batsmen');
      if (leaderResponse.data.success) {
        setTopPerformers(leaderResponse.data.data.slice(0, 3));
      }
    } catch (err) {
      console.error('Error fetching dashboard widgets:', err);
    }
  };

  useEffect(() => {
    fetchMatches();
    fetchStandingsAndPerformers();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
      {/* Top Navbar */}
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Content Panel */}
        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Welcome Banner */}
          <div className="relative glass-card p-6 md:p-8 mb-8 overflow-hidden neon-glow-cyan border-[#66fcf1]/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="bg-[#66fcf1]/10 text-[#66fcf1] text-xs font-bold px-3 py-1.5 rounded-full tracking-widest uppercase">
                  Sports Ecosystem v1.0
                </span>
                <h1 className="text-3xl md:text-4xl font-black text-white mt-3 leading-tight tracking-wider">
                  WELCOME TO THE <span className="text-[#66fcf1]">CRICVERSE</span>
                </h1>
                <p className="text-gray-400 mt-2 max-w-xl text-sm">
                  Track live ball-by-ball updates, commentary feeds, wagon wheels, and career trajectories of your favorite teams and players.
                </p>
              </div>

              {/* Dynamic Action Button Shortcut */}
              <button
                onClick={() => router.push(isHost ? '/tournaments/create' : '/tournaments')}
                className="flex items-center space-x-2 py-3 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/35 transition duration-300 hover:scale-[1.02]"
              >
                <Trophy className="w-5 h-5" />
                <span>{isHost ? 'HOST TOURNAMENT' : 'EXPLORE LEAGUES'}</span>
              </button>
            </div>
          </div>

          {/* Matches Section */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2.5">
                <Activity className="w-6 h-6 text-[#66fcf1]" />
                <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">Matches Stream</h2>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card p-6 h-48 animate-pulse bg-white/5 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 bg-white/10 rounded w-1/3"></div>
                      <div className="h-5 bg-white/10 rounded w-16"></div>
                    </div>
                    <div className="space-y-4 my-2">
                      <div className="flex justify-between items-center"><div className="h-5 bg-white/10 rounded w-1/2"></div><div className="h-5 bg-white/10 rounded w-20"></div></div>
                      <div className="flex justify-between items-center"><div className="h-5 bg-white/10 rounded w-5/12"></div><div className="h-5 bg-white/10 rounded w-24"></div></div>
                    </div>
                    <div className="h-5 bg-white/10 rounded w-1/2 mt-4"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-8 bg-red-950/20 border border-red-500/30 rounded-2xl flex flex-col items-center text-center space-y-4 max-w-xl mx-auto shadow-lg shadow-red-500/5">
                <AlertCircle className="w-12 h-12 text-red-500" />
                <div>
                  <h3 className="text-lg font-bold text-white uppercase tracking-wider">Connection Failure</h3>
                  <p className="text-red-300 text-xs mt-1 leading-relaxed">{error}</p>
                </div>
                <button
                  onClick={() => { fetchMatches(); fetchStandingsAndPerformers(); }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition duration-200 cursor-pointer"
                >
                  Retry Connection
                </button>
              </div>
            ) : matches.length === 0 ? (
              <div className="glass-card p-10 text-center border-dashed border-[#66fcf1]/20">
                <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-white mb-1">No Match Configured</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                  No matches have been configured in CricVerse yet. Start by hosting a tournament and setting up team fixtures.
                </p>
                {isHost && (
                  <button
                    onClick={() => router.push('/tournaments/create')}
                    className="py-2.5 px-6 bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition text-xs uppercase cursor-pointer"
                  >
                    Host a Tournament
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {matches.map((match) => {
                  const isLive = match.status === 'Live';
                  const isCompleted = match.status === 'Completed';

                  return (
                    <Link
                      key={match._id}
                      href={`/matches/${match._id}`}
                      className="glass-card glass-card-hover p-6 flex flex-col justify-between border-[#66fcf1]/10 block relative group"
                    >
                      {/* Top Header line inside match card */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-gray-500 font-bold tracking-wider truncate max-w-[200px]">
                          {match.tournament?.name || 'CRICVERSE FIRES'}
                        </span>
                        {isLive && (
                          <span className="flex items-center space-x-1 bg-red-950/50 border border-red-500/30 text-red-400 text-[10px] font-black tracking-widest px-2.5 py-1 rounded-full uppercase">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse-fast"></span>
                            <span>LIVE</span>
                          </span>
                        )}
                        {isCompleted && (
                          <span className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                            COMPLETED
                          </span>
                        )}
                        {match.status === 'Upcoming' && (
                          <span className="bg-gray-800 text-gray-400 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full">
                            UPCOMING
                          </span>
                        )}
                      </div>

                      {/* Team Scores Row */}
                      <div className="space-y-4 my-2">
                        {/* Team A Info */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-base md:text-lg tracking-wide">
                            {match.teamA.name}
                          </span>
                          <span className="font-mono text-white font-bold text-base">
                            {match.score.teamA.runs}/{match.score.teamA.wickets}
                            <span className="text-xs text-gray-500 font-medium pl-1.5">
                              ({match.score.teamA.overs} ov)
                            </span>
                          </span>
                        </div>

                        {/* Team B Info */}
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-base md:text-lg tracking-wide">
                            {match.teamB.name}
                          </span>
                          <span className="font-mono text-white font-bold text-base">
                            {match.score.teamB.runs}/{match.score.teamB.wickets}
                            <span className="text-xs text-gray-500 font-medium pl-1.5">
                              ({match.score.teamB.overs} ov)
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Card footer description */}
                      <div className="border-t border-[#66fcf1]/5 pt-4 mt-4 flex items-center justify-between">
                        <span className="text-xs text-[#66fcf1] font-semibold">
                          {isCompleted && match.result?.winner
                            ? `${match.result.winner.name} ${match.result.margin?.toLowerCase().startsWith('won') ? match.result.margin : 'won ' + match.result.margin}`
                            : isLive
                            ? 'Match in progress...'
                            : 'Match Scheduled'}
                        </span>
                        <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-[#66fcf1] transition duration-300 transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Analytics & Leaderboard previews */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Standings */}
            <div className="lg:col-span-2 glass-card p-6 border-[#66fcf1]/10">
              <div className="flex items-center space-x-2.5 mb-6">
                <Trophy className="w-6 h-6 text-yellow-500" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">Tournament Standings</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-400">
                  <thead className="text-xs uppercase font-bold text-gray-500 border-b border-[#66fcf1]/10">
                    <tr>
                      <th className="py-3 px-3">TEAM</th>
                      <th className="py-3 px-3">P</th>
                      <th className="py-3 px-3">W</th>
                      <th className="py-3 px-3">L</th>
                      <th className="py-3 px-3">PTS</th>
                      <th className="py-3 px-3 text-right">NRR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row: any, idx: number) => (
                      <tr key={row.team?._id || idx} className="border-b border-[#66fcf1]/5 hover:bg-[#1f2833]/15 transition">
                        <td className="py-3.5 px-3 font-bold text-white">{row.team?.name || 'Unknown Team'}</td>
                        <td className="py-3.5 px-3">{row.played}</td>
                        <td className="py-3.5 px-3 text-emerald-400">{row.won}</td>
                        <td className="py-3.5 px-3 text-red-400">{row.lost}</td>
                        <td className="py-3.5 px-3 font-mono font-bold text-[#66fcf1]">{row.points}</td>
                        <td className="py-3.5 px-3 text-right font-mono text-gray-400">
                          {row.nrr >= 0 ? `+${row.nrr.toFixed(3)}` : row.nrr.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                    {standings.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 text-xs italic font-bold">
                          No Statistics Available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Performers */}
            <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-2.5 mb-6">
                  <Award className="w-6 h-6 text-purple-500" />
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">Top Performers</h3>
                </div>
                <div className="space-y-4">
                  {topPerformers.map((player: any, idx: number) => (
                    <div key={player._id || idx} className="flex items-center justify-between border-b border-[#66fcf1]/5 pb-3">
                      <div>
                        <p className="font-bold text-white">{player.name}</p>
                        <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider">{player.role || 'Player'}</p>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold text-sm bg-emerald-500/10 px-2.5 py-1 rounded">
                        {player.runs.toLocaleString()} runs
                      </span>
                    </div>
                  ))}
                  {topPerformers.length === 0 && (
                    <p className="text-gray-500 text-xs italic text-center py-8">
                      No player statistics recorded.
                    </p>
                  )}
                </div>
              </div>
              <Link
                href="/players"
                className="mt-6 w-full py-2.5 text-center text-xs font-bold uppercase tracking-wider text-[#66fcf1] bg-[#66fcf1]/5 rounded-lg border border-[#66fcf1]/25 hover:bg-[#66fcf1]/15 transition duration-300"
              >
                View Player Rankings &rarr;
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Inline placeholder for spinning loader icon
function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
