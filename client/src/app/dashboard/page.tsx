'use client';

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { User, Activity, Trophy, Shield, HelpCircle, Briefcase, BarChart2, RefreshCw } from 'lucide-react';

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);

  const [playerData, setPlayerData] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchPlayerProfile = async () => {
      if (!user) return;
      setLoadingStats(true);
      try {
        const response = await api.get(`/players?search=${user.username}`);
        if (response.data.success && response.data.data.length > 0) {
          const exactPlayer = response.data.data.find(
            (p: any) => p.name.toLowerCase() === user.username.toLowerCase()
          ) || response.data.data[0];
          
          setPlayerData(exactPlayer);
          
          if (exactPlayer.matchHistory && exactPlayer.matchHistory.length > 0) {
            const mapped = exactPlayer.matchHistory.map((m: any, idx: number) => ({
              match: `M${idx + 1}`,
              runs: m.runs || 0,
              strikeRate: m.runs && m.balls ? Math.round((m.runs / m.balls) * 100) : 0,
              wickets: m.wickets || 0
            }));
            setChartData(mapped);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchPlayerProfile();
  }, [user]);

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-[#0b0c10]">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Header profile cards */}
            <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/10 flex flex-col md:flex-row items-center justify-between gap-6 relative">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-[#66fcf1] to-cyan-500 flex items-center justify-center font-bold text-[#0b0c10] text-3xl shadow-[0_0_15px_rgba(102,252,241,0.3)]">
                  {user?.username.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white uppercase tracking-wider">{user?.username}</h1>
                  <p className="text-gray-400 text-sm mt-0.5">{user?.email}</p>
                </div>
              </div>

              {/* Role badge */}
              <div className="flex items-center space-x-2 bg-[#1f2833]/60 border border-[#66fcf1]/30 py-2 px-4 rounded-xl">
                <Shield className="w-5 h-5 text-[#66fcf1]" />
                <div className="text-left">
                  <p className="text-gray-400 text-[9px] uppercase font-bold tracking-widest leading-none">USER ROLE</p>
                  <p className="text-white font-extrabold uppercase text-xs tracking-wider mt-1">{user?.role}</p>
                </div>
              </div>
            </div>

            {loadingStats ? (
              <div className="flex justify-center items-center py-20">
                <RefreshCw className="w-8 h-8 text-[#66fcf1] animate-spin" />
              </div>
            ) : (
              <>
                {/* Quick stats grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="glass-card p-5 border-[#66fcf1]/5 flex items-center space-x-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">CAREER MATCHES</p>
                      <p className="text-2xl font-bold text-white font-mono mt-0.5">
                        {playerData?.stats?.batting?.matches || 0}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 border-[#66fcf1]/5 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">RUNS SCORED</p>
                      <p className="text-2xl font-bold text-white font-mono mt-0.5">
                        {playerData?.stats?.batting?.runs || 0}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 border-[#66fcf1]/5 flex items-center space-x-4">
                    <div className="p-3 bg-[#66fcf1]/10 rounded-xl text-[#66fcf1]">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">BATTING AVERAGE</p>
                      <p className="text-2xl font-bold text-white font-mono mt-0.5">
                        {playerData?.stats?.batting?.average || '0.0'}
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 border-[#66fcf1]/5 flex items-center space-x-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">BOWLING WICKETS</p>
                      <p className="text-2xl font-bold text-white font-mono mt-0.5">
                        {playerData?.stats?.bowling?.wickets || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Performance charts section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Runs over time */}
                  <div className="glass-card p-6 border-[#66fcf1]/10">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">Runs scoring profile</h3>
                      <span className="text-[10px] text-[#66fcf1] font-bold border border-[#66fcf1]/20 px-2 py-0.5 rounded uppercase">BATTING</span>
                    </div>
                    
                    {chartData.length === 0 ? (
                      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-[#66fcf1]/20 rounded-xl bg-[#0b0c10]/40">
                        <BarChart2 className="w-10 h-10 text-gray-600 mb-2" />
                        <p className="text-gray-400 font-bold text-xs">No Statistics Available</p>
                        <p className="text-gray-600 text-[10px] mt-1">Participate in tournament matches to log runs.</p>
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.05)" />
                            <XAxis dataKey="match" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <Tooltip
                              contentStyle={{
                                background: '#0b0c10',
                                border: '1px solid rgba(102,252,241,0.2)',
                                borderRadius: '8px',
                                color: '#fff',
                              }}
                            />
                            <Line
                              type="monotone"
                              dataKey="runs"
                              stroke="#66fcf1"
                              strokeWidth={3}
                              activeDot={{ r: 6 }}
                              dot={{ fill: '#66fcf1', strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {/* Strike rates over time */}
                  <div className="glass-card p-6 border-[#66fcf1]/10">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">Strike rate progress</h3>
                      <span className="text-[10px] text-pink-500 font-bold border border-pink-500/20 px-2 py-0.5 rounded uppercase">PACE</span>
                    </div>

                    {chartData.length === 0 ? (
                      <div className="h-64 w-full flex flex-col items-center justify-center border border-dashed border-[#66fcf1]/20 rounded-xl bg-[#0b0c10]/40">
                        <BarChart2 className="w-10 h-10 text-gray-600 mb-2" />
                        <p className="text-gray-400 font-bold text-xs">No Statistics Available</p>
                        <p className="text-gray-600 text-[10px] mt-1">Participate in tournament matches to log strike rates.</p>
                      </div>
                    ) : (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(102,252,241,0.05)" />
                            <XAxis dataKey="match" stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} />
                            <Tooltip
                              contentStyle={{
                                background: '#0b0c10',
                                border: '1px solid rgba(102,252,241,0.2)',
                                borderRadius: '8px',
                                color: '#fff',
                              }}
                            />
                            <Bar dataKey="strikeRate" fill="#ff007f" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Role-specific features info box */}
            <div className="glass-card p-6 border-[#39ff14]/10 bg-[#1f2833]/15">
              <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-wide">
                Role Dashboard Controls
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                As a user with role <span className="text-[#66fcf1] font-semibold uppercase">{user?.role}</span>, you have access to specific scoring and configuration dashboards.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#0b0c10]/40 border border-white/5">
                  <p className="font-bold text-white text-sm">Organize Fixtures</p>
                  <p className="text-gray-500 text-xs mt-1">Create teams and tournaments. Build fixture brackets and manage match details.</p>
                </div>
                <div className="p-4 rounded-xl bg-[#0b0c10]/40 border border-white/5">
                  <p className="font-bold text-white text-sm">Ball-by-Ball scoring</p>
                  <p className="text-gray-500 text-xs mt-1">If role is organizer or admin, access the scoring room to update matches in real-time.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
