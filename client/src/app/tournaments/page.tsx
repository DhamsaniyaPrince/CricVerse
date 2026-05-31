'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { Trophy, Calendar, Plus, MapPin, LayoutList, ArrowRight } from 'lucide-react';

interface PointTableEntry {
  team: { _id: string; name: string; logo?: string };
  played: number;
  won: number;
  lost: number;
  tied: number;
  points: number;
  nrr: number;
}

interface Tournament {
  _id: string;
  name: string;
  description?: string;
  location: string;
  startDate: string;
  endDate: string;
  status: string;
  teams: any[];
  pointsTable: PointTableEntry[];
}

export default function TournamentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await api.get('/tournaments');
        if (response.data.success) {
          setTournaments(response.data.data);
        }
      } catch (err) {
        console.error('Error fetching tournaments:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  const isHost = isAuthenticated && user && (user.role === 'organizer' || user.role === 'admin');

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Page Title & Host action button */}
          <div className="flex items-center justify-between mb-8 border-b border-[#66fcf1]/10 pb-6">
            <div>
              <h1 className="text-3xl font-black text-white uppercase tracking-wider">Tournaments Portal</h1>
              <p className="text-gray-400 text-sm mt-1">Standings, schedules, and matches of ongoing championships.</p>
            </div>
            {isHost && (
              <button
                onClick={() => router.push('/tournaments/create')}
                className="flex items-center space-x-1.5 py-2.5 px-4 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-bold rounded-xl shadow-lg transition duration-200 uppercase"
              >
                <Plus className="w-4.5 h-4.5" />
                <span>Host Tournament</span>
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-6">
              {[1, 2].map(i => (
                <div key={i} className="glass-card p-6 h-64 animate-pulse bg-gray-900/40"></div>
              ))}
            </div>
          ) : tournaments.length === 0 ? (
            <div className="glass-card p-10 text-center border-dashed border-[#66fcf1]/20">
              <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-1">No Tournament Found</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
                No tournaments have been registered in the CricVerse portal yet.
              </p>
              {isHost && (
                <button
                  onClick={() => router.push('/tournaments/create')}
                  className="py-2.5 px-6 bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold rounded-xl shadow-lg shadow-cyan-500/10 hover:scale-[1.02] transition text-xs uppercase"
                >
                  Create Tournament Now
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-8">
              {tournaments.map((tournament) => (
                <div key={tournament._id} className="glass-card p-6 border-[#66fcf1]/10 space-y-6">
                  {/* Tournament Title line */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center space-x-2.5">
                        <Trophy className="w-6 h-6 text-yellow-500" />
                        <h2
                          onClick={() => router.push(`/tournaments/${tournament._id}`)}
                          className="text-xl font-black text-white uppercase hover:text-[#66fcf1] cursor-pointer transition"
                        >
                          {tournament.name}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>
                            {new Date(tournament.startDate).toLocaleDateString()} -{' '}
                            {new Date(tournament.endDate).toLocaleDateString()}
                          </span>
                        </span>
                        <span>|</span>
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{tournament.location}</span>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 self-start md:self-auto">
                      <span className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase">
                        {tournament.status}
                      </span>
                      <button
                        onClick={() => router.push(`/tournaments/${tournament._id}`)}
                        className="py-1.5 px-3 bg-[#66fcf1]/10 border border-[#66fcf1]/25 hover:bg-[#66fcf1]/20 text-[#66fcf1] font-bold rounded text-xs transition uppercase flex items-center space-x-1"
                      >
                        <span>Dashboard</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {tournament.description && (
                    <p className="text-gray-400 text-xs line-clamp-2 italic">
                      "{tournament.description}"
                    </p>
                  )}

                  {/* Points Table Standings */}
                  <div className="space-y-4">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1.5">
                      <LayoutList className="w-4 h-4" />
                      <span>Standings Point Table</span>
                    </p>
                    
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
                            ?.sort((a, b) => b.points - a.points || b.nrr - a.nrr)
                            .slice(0, 4) // Show top 4
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
                              <td colSpan={7} className="py-4 text-center text-gray-600 italic">No teams registered</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
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
