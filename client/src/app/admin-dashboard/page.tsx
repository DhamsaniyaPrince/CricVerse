'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Users,
  Trophy,
  Activity,
  AlertOctagon,
  RefreshCw,
  Search,
  Filter,
  Check,
  X,
  UserX,
  UserCheck,
  Trash2,
  AlertTriangle
} from 'lucide-react';

interface StatsOverview {
  users: { total: number; banned: number };
  tournaments: { total: number; pending: number };
  matches: { total: number; live: number };
  reports: { total: number; pending: number };
}

interface UserListItem {
  _id: string;
  username: string;
  email: string;
  role: string;
  isBanned: boolean;
  createdAt: string;
}

interface TournamentListItem {
  _id: string;
  name: string;
  organizer: { username: string; email: string };
  format: string;
  startDate: string;
  endDate: string;
}

interface MatchListItem {
  _id: string;
  title: string;
  status: string;
  score: {
    teamA: { runs: number; wickets: number; overs: number };
    teamB: { runs: number; wickets: number; overs: number };
  };
}

interface ReportListItem {
  _id: string;
  reporter: { username: string; email: string };
  reportedType: string;
  reportedId: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'tournaments' | 'matches' | 'reports' | 'logs'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  // States for lists
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // User filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userBanFilter, setUserBanFilter] = useState('');

  const fetchOverviewStats = async () => {
    try {
      const response = await api.get('/admin/overview');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchUsers = async () => {
    try {
      let url = '/admin/users';
      const params = [];
      if (userSearch) params.push(`search=${userSearch}`);
      if (userRoleFilter) params.push(`role=${userRoleFilter}`);
      if (userBanFilter) params.push(`isBanned=${userBanFilter}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }

      const response = await api.get(url);
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPendingTournaments = async () => {
    try {
      const response = await api.get('/admin/tournaments/pending');
      if (response.data.success) {
        setTournaments(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMatches = async () => {
    try {
      const response = await api.get('/matches');
      if (response.data.success) {
        setMatches(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await api.get('/admin/reports');
      if (response.data.success) {
        setReports(response.data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const response = await api.get('/admin/audit-logs');
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    }
  };

  const loadTabData = async () => {
    setIsLoading(true);
    await fetchOverviewStats();
    
    if (activeTab === 'users') await fetchUsers();
    if (activeTab === 'tournaments') await fetchPendingTournaments();
    if (activeTab === 'matches') await fetchMatches();
    if (activeTab === 'reports') await fetchReports();
    if (activeTab === 'logs') await fetchAuditLogs();
    
    setIsLoading(false);
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // Handle user ban toggle
  const handleToggleBan = async (userId: string, currentBanStatus: boolean) => {
    setSubmittingId(userId);
    try {
      const response = await api.put(`/admin/users/${userId}/ban`, { isBanned: !currentBanStatus });
      if (response.data.success) {
        alert(response.data.message);
        fetchUsers();
        fetchOverviewStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not update user ban status');
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle user role update
  const handleRoleChange = async (userId: string, newRole: string) => {
    setSubmittingId(userId);
    try {
      const response = await api.put(`/admin/users/${userId}/role`, { role: newRole });
      if (response.data.success) {
        alert(response.data.message);
        fetchUsers();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not update user role');
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle tournament approval
  const handleApproveTournament = async (tId: string) => {
    setSubmittingId(tId);
    try {
      const response = await api.put(`/admin/tournaments/${tId}/approve`);
      if (response.data.success) {
        alert(response.data.message);
        fetchPendingTournaments();
        fetchOverviewStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not approve tournament');
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle report resolution
  const handleResolveReport = async (reportId: string, status: 'Resolved' | 'Dismissed') => {
    setSubmittingId(reportId);
    try {
      const response = await api.put(`/admin/reports/${reportId}/resolve`, { status });
      if (response.data.success) {
        alert(response.data.message);
        fetchReports();
        fetchOverviewStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not update report');
    } finally {
      setSubmittingId(null);
    }
  };

  // Handle match deletion
  const handleDeleteMatch = async (matchId: string) => {
    const confirm = window.confirm('Are you sure you want to PERMANENTLY delete this match? This action is irreversible.');
    if (!confirm) return;

    setSubmittingId(matchId);
    try {
      const response = await api.delete(`/admin/matches/${matchId}`);
      if (response.data.success) {
        alert(response.data.message);
        fetchMatches();
        fetchOverviewStats();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Could not delete match');
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center space-x-2 text-[#66fcf1]">
                  <ShieldAlert className="w-8 h-8" />
                  <span>Admin Control Center</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Manage accounts, approve leagues, review reports, and audit matches.
                </p>
              </div>

              <button
                onClick={loadTabData}
                className="flex items-center space-x-2 py-2.5 px-4 bg-[#1f2833]/30 border border-white/5 rounded-xl text-gray-400 hover:text-white transition duration-200"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">Sync Stats</span>
              </button>
            </div>

            {/* TAB SELECTIONS */}
            <div className="flex border-b border-[#66fcf1]/15 mb-8 overflow-x-auto whitespace-nowrap scrollbar-hide">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'overview'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                System Overview
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'users'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                User Accounts ({stats?.users.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('tournaments')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'tournaments'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Approvals ({stats?.tournaments.pending || 0})
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'matches'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Audited Matches ({stats?.matches.total || 0})
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'reports'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Reports Desk ({stats?.reports.pending || 0})
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition border-b-2 ${
                  activeTab === 'logs'
                    ? 'border-[#66fcf1] text-[#66fcf1]'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                Audit Logs
              </button>
            </div>

            {isLoading ? (
              <div className="flex justify-center items-center py-32">
                <RefreshCw className="w-10 h-10 text-[#66fcf1] animate-spin" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                {/* 1. OVERVIEW TAB */}
                {activeTab === 'overview' && stats && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-8"
                  >
                    {/* Counters grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="glass-card p-5 border-[#66fcf1]/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Total Accounts</span>
                            <span className="text-3xl font-black font-mono text-white mt-1 block">{stats.users.total}</span>
                          </div>
                          <Users className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="mt-3 text-[10px] text-red-500 font-bold uppercase">
                          {stats.users.banned} Accounts Suspended
                        </div>
                      </div>

                      <div className="glass-card p-5 border-[#66fcf1]/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Tournaments</span>
                            <span className="text-3xl font-black font-mono text-white mt-1 block">{stats.tournaments.total}</span>
                          </div>
                          <Trophy className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="mt-3 text-[10px] text-yellow-500 font-bold uppercase animate-pulse">
                          {stats.tournaments.pending} Awaiting Approval
                        </div>
                      </div>

                      <div className="glass-card p-5 border-[#66fcf1]/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Matches Audited</span>
                            <span className="text-3xl font-black font-mono text-white mt-1 block">{stats.matches.total}</span>
                          </div>
                          <Activity className="w-5 h-5 text-gray-600" />
                        </div>
                        <div className="mt-3 text-[10px] text-green-400 font-bold uppercase">
                          {stats.matches.live} In Progress Now
                        </div>
                      </div>

                      <div className="glass-card p-5 border-[#66fcf1]/10">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">Unresolved Concerns</span>
                            <span className="text-3xl font-black font-mono text-red-500 mt-1 block">{stats.reports.pending}</span>
                          </div>
                          <AlertOctagon className="w-5 h-5 text-red-500" />
                        </div>
                        <div className="mt-3 text-[10px] text-gray-500 font-bold uppercase">
                          {stats.reports.total} reports generated
                        </div>
                      </div>
                    </div>

                    {/* Operational Alert banner */}
                    {stats.tournaments.pending > 0 || stats.reports.pending > 0 ? (
                      <div className="p-5 rounded-2xl bg-yellow-950/20 border border-yellow-500/30 flex items-start space-x-3 text-yellow-300">
                        <AlertTriangle className="w-6 h-6 flex-shrink-0 text-yellow-500 animate-pulse" />
                        <div>
                          <h4 className="font-extrabold uppercase text-sm">Action Required</h4>
                          <p className="text-xs text-gray-400 mt-1">
                            There are {stats.tournaments.pending} tournament registrations and {stats.reports.pending} unresolved user reports requiring review. Use the tabs above to process them.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-5 rounded-2xl bg-green-950/20 border border-green-500/20 flex items-start space-x-3 text-green-300">
                        <Check className="w-6 h-6 flex-shrink-0 text-green-400" />
                        <div>
                          <h4 className="font-extrabold uppercase text-sm">System Healthy</h4>
                          <p className="text-xs text-gray-400 mt-1">
                            All registration queues are clear and no pending user reports remain. System runs at maximum efficiency.
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 2. USER MANAGEMENT TAB */}
                {activeTab === 'users' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {/* User search controls */}
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1 flex items-center space-x-2 bg-[#1f2833]/25 border border-white/5 py-2.5 px-4 rounded-xl">
                        <Search className="w-4 h-4 text-gray-500" />
                        <input
                          type="text"
                          placeholder="Search username or email..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                          className="bg-transparent text-sm text-white focus:outline-none w-full placeholder-gray-600"
                        />
                      </div>

                      <div className="flex items-center space-x-2 bg-[#1f2833]/25 border border-white/5 py-1 px-3 rounded-xl">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Role:</span>
                        <select
                          value={userRoleFilter}
                          onChange={(e) => setUserRoleFilter(e.target.value)}
                          className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="" className="bg-[#0b0c10]">All Roles</option>
                          <option value="player" className="bg-[#0b0c10]">Player</option>
                          <option value="captain" className="bg-[#0b0c10]">Captain</option>
                          <option value="organizer" className="bg-[#0b0c10]">Organizer</option>
                          <option value="admin" className="bg-[#0b0c10]">Admin</option>
                        </select>
                      </div>

                      <div className="flex items-center space-x-2 bg-[#1f2833]/25 border border-white/5 py-1 px-3 rounded-xl">
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Status:</span>
                        <select
                          value={userBanFilter}
                          onChange={(e) => setUserBanFilter(e.target.value)}
                          className="bg-transparent text-xs text-white focus:outline-none cursor-pointer"
                        >
                          <option value="" className="bg-[#0b0c10]">All Status</option>
                          <option value="false" className="bg-[#0b0c10]">Active</option>
                          <option value="true" className="bg-[#0b0c10]">Suspended</option>
                        </select>
                      </div>

                      <button
                        onClick={fetchUsers}
                        className="py-2.5 px-6 rounded-xl bg-[#66fcf1] text-[#0b0c10] font-black text-xs uppercase hover:bg-cyan-400 transition duration-200"
                      >
                        Filter
                      </button>
                    </div>

                    {/* Users Data table */}
                    <div className="glass-card p-6 border-[#66fcf1]/10">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                          <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                            <tr>
                              <th className="py-3 px-3">Username</th>
                              <th className="py-3 px-3">Email Address</th>
                              <th className="py-3 px-3">Created Date</th>
                              <th className="py-3 px-3 text-center">User Role</th>
                              <th className="py-3 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((u) => (
                              <tr key={u._id} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-4 px-3 font-bold text-white flex items-center space-x-2">
                                  <span>{u.username}</span>
                                  {u.isBanned && (
                                    <span className="bg-red-950/45 text-red-500 border border-red-500/20 text-[8px] font-bold px-2 py-0.5 rounded uppercase">
                                      Suspended
                                    </span>
                                  )}
                                </td>
                                <td className="py-4 px-3">{u.email}</td>
                                <td className="py-4 px-3 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                <td className="py-4 px-3 text-center">
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleRoleChange(u._id, e.target.value)}
                                    disabled={submittingId === u._id}
                                    className="bg-[#0b0c10] border border-white/10 text-xs text-white rounded-lg py-1 px-2.5"
                                  >
                                    <option value="player">Player</option>
                                    <option value="captain">Captain</option>
                                    <option value="organizer">Organizer</option>
                                    <option value="admin">Admin</option>
                                  </select>
                                </td>
                                <td className="py-4 px-3 text-right">
                                  <button
                                    onClick={() => handleToggleBan(u._id, u.isBanned)}
                                    disabled={submittingId === u._id}
                                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase transition ${
                                      u.isBanned
                                        ? 'bg-green-600 hover:bg-green-500 text-white'
                                        : 'bg-red-950/40 border border-red-500/30 text-red-400 hover:bg-red-950/80'
                                    }`}
                                  >
                                    {submittingId === u._id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin mx-auto" />
                                    ) : u.isBanned ? (
                                      'Re-Activate'
                                    ) : (
                                      'Suspend'
                                    )}
                                  </button>
                                </td>
                              </tr>
                            ))}

                            {users.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-600 italic">
                                  No accounts found matching filter constraints.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. TOURNAMENT APPROVALS TAB */}
                {activeTab === 'tournaments' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {tournaments.map((t) => (
                      <div key={t._id} className="glass-card p-6 border-yellow-500/10 flex flex-col justify-between">
                        <div className="space-y-4">
                          <div className="flex justify-between items-start">
                            <h3 className="text-lg font-bold text-white uppercase">{t.name}</h3>
                            <span className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Pending Approval
                            </span>
                          </div>

                          <div className="text-xs text-gray-400 space-y-1.5 border-t border-white/5 pt-4">
                            <p>
                              Organizer:{' '}
                              <span className="text-white font-bold">{t.organizer?.username}</span> (
                              {t.organizer?.email})
                            </p>
                            <p>
                              Format: <span className="text-white uppercase font-mono">{t.format}</span>
                            </p>
                            <p>
                              Schedule:{' '}
                              <span className="font-mono">
                                {new Date(t.startDate).toLocaleDateString()} -{' '}
                                {new Date(t.endDate).toLocaleDateString()}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-white/5 flex items-center space-x-3">
                          <button
                            onClick={() => handleApproveTournament(t._id)}
                            disabled={submittingId === t._id}
                            className="flex-1 py-2 rounded-lg bg-green-600 text-white font-bold text-xs uppercase hover:bg-green-500 disabled:opacity-50 transition duration-200"
                          >
                            {submittingId === t._id ? 'APPROVING...' : 'APPROVE LEAGUE'}
                          </button>
                        </div>
                      </div>
                    ))}

                    {tournaments.length === 0 && (
                      <div className="md:col-span-2 glass-card p-12 text-center border-dashed border-[#66fcf1]/20">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold">No Pending Approvals</h3>
                        <p className="text-gray-500 text-xs mt-1">All organizer tournament registrations are currently approved.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 4. MATCH AUDITS TAB */}
                {activeTab === 'matches' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="glass-card p-6 border-[#66fcf1]/10">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-400">
                          <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                            <tr>
                              <th className="py-3 px-3">Match Title</th>
                              <th className="py-3 px-3 text-center">Status</th>
                              <th className="py-3 px-3 text-center">Innings Score</th>
                              <th className="py-3 px-3 text-right">Audits</th>
                            </tr>
                          </thead>
                          <tbody>
                            {matches.map((m) => (
                              <tr key={m._id} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-4 px-3 font-bold text-white">{m.title}</td>
                                <td className="py-4 px-3 text-center">
                                  <span
                                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                      m.status === 'Live'
                                        ? 'bg-green-500/15 border border-green-500/30 text-green-400'
                                        : m.status === 'Completed'
                                        ? 'bg-blue-500/15 border border-blue-500/30 text-blue-400'
                                        : 'bg-gray-800 border border-white/5 text-gray-400'
                                    }`}
                                  >
                                    {m.status}
                                  </span>
                                </td>
                                <td className="py-4 px-3 text-center font-mono text-xs">
                                  {m.score?.teamB?.runs}/{m.score?.teamB?.wickets} ({m.score?.teamB?.overs} ov)
                                </td>
                                <td className="py-4 px-3 text-right">
                                  <button
                                    onClick={() => handleDeleteMatch(m._id)}
                                    disabled={submittingId === m._id}
                                    className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white transition duration-200"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}

                            {matches.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-600 italic">
                                  No match logs stored in database.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 5. REPORTS DESK TAB */}
                {activeTab === 'reports' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    {reports.map((r) => (
                      <div
                        key={r._id}
                        className={`glass-card p-6 border-l-4 flex flex-col md:flex-row md:items-center justify-between gap-6 ${
                          r.status === 'Pending'
                            ? 'border-yellow-500 border-yellow-500/10'
                            : r.status === 'Resolved'
                            ? 'border-green-500 border-green-500/5'
                            : 'border-gray-500 border-white/5'
                        }`}
                      >
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="bg-red-950/40 text-red-500 text-[8px] font-bold px-2 py-0.5 rounded border border-red-500/20 uppercase tracking-widest">
                              Concern: {r.reportedType}
                            </span>
                            <span
                              className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase ${
                                r.status === 'Pending'
                                  ? 'bg-yellow-500/15 text-yellow-400'
                                  : 'bg-green-500/15 text-green-400'
                              }`}
                            >
                              {r.status}
                            </span>
                          </div>

                          <p className="text-white text-sm">
                            Reason: <span className="font-semibold">"{r.reason}"</span>
                          </p>

                          <div className="text-[10px] text-gray-500 space-y-0.5">
                            <p>
                              Filed by:{' '}
                              <span className="text-gray-300 font-bold">{r.reporter?.username}</span> (
                              {r.reporter?.email})
                            </p>
                            <p>Target ID: <span className="font-mono">{r.reportedId}</span></p>
                            <p>Date: {new Date(r.createdAt).toLocaleString()}</p>
                          </div>
                        </div>

                        {r.status === 'Pending' && (
                          <div className="flex md:flex-col items-center md:items-end gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleResolveReport(r._id, 'Resolved')}
                              disabled={submittingId === r._id}
                              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white text-xs font-bold uppercase transition"
                            >
                              Mark Resolved
                            </button>
                            <button
                              onClick={() => handleResolveReport(r._id, 'Dismissed')}
                              disabled={submittingId === r._id}
                              className="px-4 py-2 rounded-lg bg-[#1f2833]/30 border border-white/5 text-gray-400 hover:text-white text-xs font-bold uppercase transition"
                            >
                              Dismiss
                            </button>
                          </div>
                        )}
                      </div>
                    ))}

                    {reports.length === 0 && (
                      <div className="glass-card p-12 text-center border-dashed border-[#66fcf1]/20">
                        <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-white font-bold">Inbox Empty</h3>
                        <p className="text-gray-500 text-xs mt-1">No user reports have been filed yet.</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* 6. AUDIT LOGS TAB */}
                {activeTab === 'logs' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <div className="glass-card p-6 border-[#66fcf1]/10">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 font-mono">
                        System Activity Audit Logs
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-400">
                          <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                            <tr>
                              <th className="py-3 px-3">Timestamp</th>
                              <th className="py-3 px-3">Actor (Role)</th>
                              <th className="py-3 px-3">Action</th>
                              <th className="py-3 px-3">Details</th>
                              <th className="py-3 px-3 font-mono text-right">IP Address</th>
                            </tr>
                          </thead>
                          <tbody>
                            {logs.map((log) => (
                              <tr key={log._id} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3.5 px-3 font-mono text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                                <td className="py-3.5 px-3">
                                  <span className="font-bold text-white block">{log.username}</span>
                                  <span className="text-[9px] text-gray-500 uppercase block">{log.userRole}</span>
                                </td>
                                <td className="py-3.5 px-3">
                                  <span className="bg-[#66fcf1]/10 border border-[#66fcf1]/25 text-[#66fcf1] text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="py-3.5 px-3 text-white max-w-xs truncate">{log.details}</td>
                                <td className="py-3.5 px-3 font-mono text-xs text-gray-500 text-right">{log.ipAddress}</td>
                              </tr>
                            ))}

                            {logs.length === 0 && (
                              <tr>
                                <td colSpan={5} className="py-12 text-center text-gray-600 italic">
                                  No audit log records stored.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
