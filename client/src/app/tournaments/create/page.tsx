'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import api from '@/utils/api';
import { Trophy, Calendar, MapPin, DollarSign, Users, FileText, ArrowLeft, RefreshCw } from 'lucide-react';

export default function CreateTournamentPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    logo: '',
    location: '',
    startDate: '',
    endDate: '',
    format: 'League',
    maxTeams: 8,
    entryFee: 0
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const value = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
    setForm({ ...form, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Form validations
    if (new Date(form.startDate) > new Date(form.endDate)) {
      setError('Start date cannot be after end date');
      setSubmitting(false);
      return;
    }

    if (form.maxTeams < 2) {
      setError('A tournament must allow at least 2 teams');
      setSubmitting(false);
      return;
    }

    // Default mock sports banner if logo is left blank
    const tournamentData = { ...form };
    if (!tournamentData.logo) {
      const bannerList = [
        'https://images.unsplash.com/photo-1531415080290-bc9b8998063a?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1540747737956-37872f747ee7?auto=format&fit=crop&q=80&w=600',
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=600'
      ];
      tournamentData.logo = bannerList[Math.floor(Math.random() * bannerList.length)];
    }

    try {
      const response = await api.post('/tournaments', tournamentData);
      if (response.data.success) {
        alert('Tournament created successfully! Awaiting admin activation.');
        router.push('/tournaments');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create tournament');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
      <div className="flex flex-col min-h-screen bg-[#0b0c10]">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-4xl mx-auto w-full">
            {/* Back link */}
            <button
              onClick={() => router.push('/tournaments')}
              className="flex items-center space-x-2 text-gray-400 hover:text-[#66fcf1] text-xs font-bold uppercase mb-6 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Tournaments</span>
            </button>

            {/* Header */}
            <div className="border-b border-[#66fcf1]/10 pb-6 mb-8">
              <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Trophy className="w-8 h-8 text-[#66fcf1]" />
                <span>Host New Tournament</span>
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Configure formatting, scheduling, location, and registry sizes for your league.
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/45 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Form card */}
            <form onSubmit={handleSubmit} className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Name */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tournament Name</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. CricVerse Premier Cup 2026"
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                  />
                </div>

                {/* Banner Banner */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Banner / Logo Image URL (Optional)</label>
                  <input
                    type="text"
                    name="logo"
                    value={form.logo}
                    onChange={handleChange}
                    placeholder="e.g. https://images.unsplash.com/... or leave blank for a default theme"
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    <span>Location / City</span>
                  </label>
                  <input
                    type="text"
                    required
                    name="location"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="e.g. Mumbai, India"
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30"
                  />
                </div>

                {/* Format selection */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Tournament Format</label>
                  <select
                    name="format"
                    value={form.format}
                    onChange={handleChange}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none cursor-pointer"
                  >
                    <option value="League">League (Round-Robin)</option>
                    <option value="Knockout">Knockout (Single Elimination)</option>
                  </select>
                </div>

                {/* Max Teams */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>Maximum Teams Limit</span>
                  </label>
                  <input
                    type="number"
                    required
                    name="maxTeams"
                    min={2}
                    max={32}
                    value={form.maxTeams}
                    onChange={handleChange}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30 font-mono"
                  />
                </div>

                {/* Entry Fee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                    <span>Entry Fee (USD)</span>
                  </label>
                  <input
                    type="number"
                    name="entryFee"
                    min={0}
                    value={form.entryFee}
                    onChange={handleChange}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30 font-mono"
                  />
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>Start Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none cursor-pointer font-mono"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-gray-500" />
                    <span>End Date</span>
                  </label>
                  <input
                    type="date"
                    required
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none cursor-pointer font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center space-x-1">
                    <FileText className="w-3.5 h-3.5 text-gray-500" />
                    <span>Description / Rules</span>
                  </label>
                  <textarea
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Provide details about regulations, prize pools, and schedule conditions..."
                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white focus:outline-none focus:border-[#66fcf1]/30 placeholder-gray-600"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold tracking-wide uppercase rounded-lg transition duration-200 flex items-center justify-center space-x-2"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Tournament...</span>
                  </>
                ) : (
                  <span>Publish Tournament</span>
                )}
              </button>
            </form>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
