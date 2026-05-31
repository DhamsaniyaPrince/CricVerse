'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/api';
import { Key, CheckCircle, AlertCircle, RefreshCw, LogIn } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post(`/auth/reset-password/${token}`, { password });
      if (response.data.success) {
        setSuccess('Password updated successfully! You can now log in.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(response.data.message || 'Reset failed');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Token has expired or is invalid. Please request a new link.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 relative overflow-hidden">
      {/* Background graphics */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-md w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-wider text-white uppercase">
            CHOOSE NEW <span className="text-[#66fcf1]">PASSWORD</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm tracking-wide">
            ENTER YOUR NEW CRICVERSE ACCESS CREDENTIALS BELOW
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/45 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/45 border border-emerald-500/30 flex items-start space-x-3 text-emerald-300 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {!success && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">NEW PASSWORD</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">CONFIRM PASSWORD</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold tracking-wide uppercase shadow-lg shadow-[#66fcf1]/25 hover:from-cyan-400 hover:to-cyan-600 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition duration-300 flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <span>UPDATE PASSWORD</span>
              )}
            </button>
          </form>
        )}

        {success && (
          <div className="mt-8 text-center">
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold transition duration-200"
            >
              <LogIn className="w-5 h-5" />
              <span>LOG IN NOW</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
