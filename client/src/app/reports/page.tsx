'use client';

import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
  Download,
  FileText,
  RefreshCw,
  Lock,
  Trophy,
  User,
  Award,
  Activity,
  Calendar,
  Shield,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

interface ReportOption {
  _id: string;
  name?: string;
  title?: string;
  role?: string;
}

interface DashboardData {
  players: ReportOption[];
  teams: ReportOption[];
  tournaments: ReportOption[];
  matches: ReportOption[];
}

export default function ReportsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingFormat, setDownloadingFormat] = useState<'pdf' | 'excel' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selector state
  const [reportType, setReportType] = useState<'player' | 'team' | 'tournament' | 'match' | 'admin'>('player');
  const [selectedId, setSelectedId] = useState<string>('');
  const [pdfTheme, setPdfTheme] = useState<'dark' | 'light'>('dark');
  const [selectedAdminType, setSelectedAdminType] = useState<'system' | 'user_growth' | 'team_growth' | 'tournament_activity' | 'platform_analytics'>('system');
  
  // Available selections returned from backend role-filter
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    players: [],
    teams: [],
    tournaments: [],
    matches: []
  });

  // Export history logs
  const [recentExports, setRecentExports] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await api.get('/reports/dashboard');
      if (response.data.success) {
        setDashboardData(response.data.data);
        
        // Auto-select first item of default player tab
        const defaultItems = response.data.data.players;
        if (defaultItems && defaultItems.length > 0) {
          setSelectedId(defaultItems[0]._id);
        }
      }
    } catch (err: any) {
      console.error('Error fetching reports dashboard:', err);
      setErrorMessage(err.response?.data?.message || 'Failed to load report selectors. Check server connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExportLogs = async () => {
    try {
      if (user?.role === 'admin') {
        const response = await api.get('/admin/audit-logs');
        if (response.data.success) {
          const exportLogs = response.data.data.filter((log: any) => log.action === 'Report Exported');
          setRecentExports(exportLogs);
        }
      } else {
        setRecentExports([
          {
            _id: 'session-1',
            createdAt: new Date().toISOString(),
            action: 'Report Exported',
            details: 'Exported session reports ledger.',
            username: user?.username || 'You',
            userRole: user?.role || 'player',
            ipAddress: 'Local'
          }
        ]);
      }
    } catch (err) {
      console.error('Error loading export logs:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    fetchExportLogs();
  }, [user]);

  // Adjust selected ID when report category changes
  useEffect(() => {
    if (reportType === 'admin') {
      setSelectedId('admin');
      return;
    }
    const items = dashboardData[
      reportType === 'player'
        ? 'players'
        : reportType === 'team'
        ? 'teams'
        : reportType === 'tournament'
        ? 'tournaments'
        : 'matches'
    ];
    if (items && items.length > 0) {
      setSelectedId(items[0]._id);
    } else {
      setSelectedId('');
    }
  }, [reportType, dashboardData]);

  const handleDownload = async (format: 'pdf' | 'excel') => {
    if (reportType !== 'admin' && !selectedId) {
      setErrorMessage('Please select a target document from the dropdown.');
      return;
    }

    setDownloadingFormat(format);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      let response;
      let fileName = '';

      if (reportType === 'admin') {
        response = await api.get(`/reports/admin/${selectedAdminType}?format=${format}&theme=${pdfTheme}`, {
          responseType: 'blob'
        });
        const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
        fileName = `admin_${selectedAdminType}_report_${pdfTheme}.${fileExtension}`;
      } else {
        response = await api.get(`/reports/${reportType}/${selectedId}?format=${format}&theme=${pdfTheme}`, {
          responseType: 'blob'
        });

        const targetList = dashboardData[
          reportType === 'player'
            ? 'players'
            : reportType === 'team'
            ? 'teams'
            : reportType === 'tournament'
            ? 'tournaments'
            : 'matches'
        ];
        const targetDoc = targetList.find(item => item._id === selectedId);
        const docName = targetDoc ? (targetDoc.name || targetDoc.title || 'report') : 'report';
        const fileExtension = format === 'excel' ? 'xlsx' : 'pdf';
        fileName = `${reportType}_${docName.replace(/\s+/g, '_').toLowerCase()}_report_${pdfTheme}.${fileExtension}`;
      }

      // Create browser link to save blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setSuccessMessage(`Successfully compiled and downloaded ${fileName}`);
      
      // Refresh activity log
      setTimeout(() => fetchExportLogs(), 1500);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage('Access denied or export failed. You may not possess the required captain or organizer role privileges.');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName?.toLowerCase()) {
      case 'admin':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'organizer':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'captain':
        return 'bg-[#66fcf1]/20 text-[#66fcf1] border border-[#66fcf1]/30';
      default:
        return 'bg-gray-800 text-gray-400 border border-white/5';
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-[#0b0c10] text-gray-200 overflow-hidden font-sans">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        
        <div className="flex-1 flex flex-col overflow-y-auto">
          <Navbar onMenuClick={() => setSidebarOpen(true)} />
          
          <main className="flex-1 p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#66fcf1]/10 pb-6 space-y-4 md:space-y-0">
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider font-mono flex items-center space-x-3">
                  <FileText className="w-8 h-8 text-[#66fcf1]" />
                  <span>LOGISTICS & DATA EXPORTS</span>
                </h1>
                <p className="text-gray-500 text-xs mt-1 uppercase font-bold tracking-wider">
                  Generate professional PDF analysis card and Excel sheets with role privileges.
                </p>
              </div>
            </div>

            {/* Error / Success alerts */}
            {errorMessage && (
              <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl flex items-start space-x-3 text-red-300 text-xs">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider mb-1">Access Restricted / Error</span>
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}
            
            {successMessage && (
              <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-start space-x-3 text-emerald-300 text-xs">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block uppercase tracking-wider mb-1">Export Complete</span>
                  <p>{successMessage}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT PANEL: Export Selector Control */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-6 border-[#66fcf1]/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#66fcf1]/5 rounded-full blur-2xl"></div>
                  
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-6 font-mono">
                    Report Parameters Configuration
                  </h3>

                  {/* PDF Theme Toggle Selector */}
                  <div className="space-y-3 mb-6">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Select PDF Visual Theme
                    </label>
                    <div className="flex bg-[#1f2833]/30 border border-white/5 rounded-xl p-1 max-w-[280px]">
                      <button
                        onClick={() => setPdfTheme('dark')}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-300 ${
                          pdfTheme === 'dark'
                            ? 'bg-[#66fcf1] text-[#0b0c10] shadow-md shadow-[#66fcf1]/10'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Dark Theme
                      </button>
                      <button
                        onClick={() => setPdfTheme('light')}
                        className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition duration-300 ${
                          pdfTheme === 'light'
                            ? 'bg-white text-gray-900 shadow-md shadow-white/10'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Light Theme
                      </button>
                    </div>
                  </div>

                  {/* 1. Category selector */}
                  <div className="space-y-3 mb-6">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Select Report Category
                    </label>
                    <div className={`grid grid-cols-2 ${user?.role === 'admin' ? 'sm:grid-cols-5' : 'sm:grid-cols-4'} gap-3`}>
                      <button
                        onClick={() => setReportType('player')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition duration-300 ${
                          reportType === 'player'
                            ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-white'
                            : 'bg-[#1f2833]/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <User className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Player</span>
                      </button>

                      <button
                        onClick={() => setReportType('team')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition duration-300 ${
                          reportType === 'team'
                            ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-white'
                            : 'bg-[#1f2833]/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <Award className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Team</span>
                      </button>

                      <button
                        onClick={() => setReportType('tournament')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition duration-300 ${
                          reportType === 'tournament'
                            ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-white'
                            : 'bg-[#1f2833]/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <Trophy className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">League</span>
                      </button>

                      <button
                        onClick={() => setReportType('match')}
                        className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition duration-300 ${
                          reportType === 'match'
                            ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-white'
                            : 'bg-[#1f2833]/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <Activity className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase tracking-wide">Match</span>
                      </button>

                      {user?.role === 'admin' && (
                        <button
                          onClick={() => setReportType('admin')}
                          className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 transition duration-300 ${
                            reportType === 'admin'
                              ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-white'
                              : 'bg-[#1f2833]/30 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                          }`}
                        >
                          <Shield className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase tracking-wide">Admin</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Specific Target Document Dropdown */}
                  <div className="space-y-3 mb-8">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block">
                      Choose Target {reportType.toUpperCase()} Record
                    </label>
                    {isLoading ? (
                      <div className="h-11 w-full rounded-xl bg-[#1f2833]/20 border border-white/5 animate-pulse flex items-center px-4 text-xs text-gray-600">
                        Querying role-authorized documents from CricVerse...
                      </div>
                    ) : (
                      <>
                        {reportType === 'admin' ? (
                          <select
                            value={selectedAdminType}
                            onChange={(e) => setSelectedAdminType(e.target.value as any)}
                            className="w-full bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl text-sm focus:outline-none focus:border-[#66fcf1] text-white cursor-pointer"
                          >
                            <option value="system" className="bg-[#0b0c10]">System Report (Database & Logs summary)</option>
                            <option value="user_growth" className="bg-[#0b0c10]">User Growth Report (Registrations & Role distribution)</option>
                            <option value="team_growth" className="bg-[#0b0c10]">Team Growth Report (Team creations & statistics)</option>
                            <option value="tournament_activity" className="bg-[#0b0c10]">Tournament Activity Report (Active tournament fixtures)</option>
                            <option value="platform_analytics" className="bg-[#0b0c10]">Platform Analytics Report (User actions & auditing)</option>
                          </select>
                        ) : (
                          <select
                            value={selectedId}
                            onChange={(e) => setSelectedId(e.target.value)}
                            className="w-full bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl text-sm focus:outline-none focus:border-[#66fcf1] text-white cursor-pointer"
                          >
                            {reportType === 'player' &&
                              dashboardData.players.map(item => (
                                <option key={item._id} value={item._id} className="bg-[#0b0c10]">
                                  {item.name} {item.role ? `(${item.role})` : ''}
                                </option>
                              ))}
                            {reportType === 'team' &&
                              dashboardData.teams.map(item => (
                                <option key={item._id} value={item._id} className="bg-[#0b0c10]">
                                  {item.name}
                                </option>
                              ))}
                            {reportType === 'tournament' &&
                              dashboardData.tournaments.map(item => (
                                <option key={item._id} value={item._id} className="bg-[#0b0c10]">
                                  {item.name}
                                </option>
                              ))}
                            {reportType === 'match' &&
                              dashboardData.matches.map(item => (
                                <option key={item._id} value={item._id} className="bg-[#0b0c10]">
                                  {item.title}
                                </option>
                              ))}
                            {((reportType === 'player' && dashboardData.players.length === 0) ||
                              (reportType === 'team' && dashboardData.teams.length === 0) ||
                              (reportType === 'tournament' && dashboardData.tournaments.length === 0) ||
                              (reportType === 'match' && dashboardData.matches.length === 0)) && (
                              <option value="" disabled className="bg-[#0b0c10]">
                                No documents available to export for your role.
                              </option>
                            )}
                          </select>
                        )}
                      </>
                    )}
                  </div>

                  {/* 3. Export Actions Block */}
                  <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center gap-4">
                    <button
                      onClick={() => handleDownload('pdf')}
                      disabled={downloadingFormat !== null || !selectedId}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20 active:scale-95 text-white transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {downloadingFormat === 'pdf' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                      <span>Export Document PDF</span>
                    </button>

                    <button
                      onClick={() => handleDownload('excel')}
                      disabled={downloadingFormat !== null || !selectedId}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-amber-600 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-500/20 active:scale-95 text-white transition flex items-center justify-center space-x-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    >
                      {downloadingFormat === 'excel' ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4" />
                      )}
                      <span>Export Spreadsheet Excel</span>
                    </button>
                  </div>
                </div>

                {/* Dashboard guides/details helper */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card p-5 border-[#66fcf1]/5 flex gap-4 items-start">
                    <FileText className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">PDF Report Sheet</h4>
                      <p className="text-gray-500 text-[10px] leading-relaxed mt-1">
                        Formatted analytical summary suitable for printing or sharing. Contains cover blocks, key metrics tables, and logs with grid headers.
                      </p>
                    </div>
                  </div>

                  <div className="glass-card p-5 border-[#66fcf1]/5 flex gap-4 items-start">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-bold text-white text-xs uppercase tracking-wider">Excel Workbook</h4>
                      <p className="text-gray-500 text-[10px] leading-relaxed mt-1">
                        Raw tabular spreadsheet exports formatted in cells with optimal widths and highlights. Best for custom offline database sorting and charting.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT PANEL: User Privileges & Logs */}
              <div className="space-y-6">
                {/* 1. Privileges Card */}
                <div className="glass-card p-6 border-[#66fcf1]/10 bg-gradient-to-b from-[#1f2833]/15 to-transparent relative overflow-hidden">
                  <div className="flex items-center space-x-3 mb-4">
                    <Shield className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-white font-mono">
                      Your Authorization
                    </h3>
                  </div>

                  <div className="flex items-center space-x-3 bg-white/5 border border-white/5 rounded-xl p-3.5 mb-6">
                    <div className="w-9 h-9 rounded-lg bg-[#0b0c10] flex items-center justify-center font-bold text-white text-sm">
                      {user?.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-white text-xs block">{user?.username}</span>
                      <span className={`inline-block text-[8px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${getRoleBadgeStyle(user?.role || '')}`}>
                        {user?.role}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-[10px] text-gray-400 leading-relaxed border-t border-white/5 pt-4">
                    <span className="font-bold block uppercase tracking-wider text-gray-500">Privilege Rules:</span>
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] mt-1.5 flex-shrink-0"></div>
                      <p><strong className="text-gray-300">Admin:</strong> Complete authorization to download player, team, tournament, and match sheets.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] mt-1.5 flex-shrink-0"></div>
                      <p><strong className="text-gray-300">Captain:</strong> Authorized to download stats summaries for your team and player roster.</p>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#66fcf1] mt-1.5 flex-shrink-0"></div>
                      <p><strong className="text-gray-300">Organizer:</strong> Authorized to download full report tables and registration details for leagues you setup.</p>
                    </div>
                  </div>
                </div>

                {/* 2. Download Activity Logs */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <h3 className="text-xs uppercase font-extrabold tracking-widest text-red-500 mb-4 font-mono">
                    Recent Export Log Activity
                  </h3>
                  <div className="space-y-3.5 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
                    {recentExports.map((log) => (
                      <div key={log._id} className="p-3 bg-white/5 border border-white/5 rounded-xl text-[10px] space-y-1 relative">
                        <div className="flex justify-between items-center text-gray-500 font-mono">
                          <span>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <span className="text-[8px] font-black uppercase text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{log.username}</span>
                        </div>
                        <p className="text-gray-300 font-medium leading-snug">{log.details}</p>
                      </div>
                    ))}

                    {recentExports.length === 0 && (
                      <div className="text-center py-6 text-gray-600 italic">
                        No recent download activities tracked in this session.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
