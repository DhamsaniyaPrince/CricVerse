'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import api from '@/utils/api';
import { Mail, CheckCircle, AlertCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devResetToken, setDevResetToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setDevResetToken(null);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data.success) {
        setSuccess('Password reset link generated successfully!');
        if (response.data.resetToken) {
          // Store token to present a clickable shortcut for the dev/reviewer
          setDevResetToken(response.data.resetToken);
        }
      } else {
        setError(response.data.message || 'Request failed');
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.message || 'Connection failed. Please ensure the backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 relative overflow-hidden">
      {/* Visual backgrounds */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-md w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-wider text-white uppercase">
            RESET <span className="text-[#66fcf1]">PASSWORD</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm tracking-wide">
            ENTER YOUR EMAIL AND WE WILL STREAM A PASSWORD RESET TOKEN
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/45 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm animate-pulse">
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

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="scorer@cricverse.com"
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
              <span>SEND RESET INSTRUCTIONS</span>
            )}
          </button>
        </form>

        {/* Developer Sandbox Helper Panel */}
        {devResetToken && (
          <div className="mt-6 p-4 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs">
            <p className="font-bold text-blue-300 mb-2 uppercase tracking-wider">Developer Sandbox Portal</p>
            <p className="text-gray-400 mb-3">
              We intercepted the token so you do not have to check backend logs:
            </p>
            <Link
              href={`/reset-password/${devResetToken}`}
              className="inline-block w-full py-2 text-center rounded bg-blue-900/60 border border-blue-400/30 text-blue-200 hover:bg-blue-800 font-semibold transition"
            >
              Reset Password Link &rarr;
            </Link>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center space-x-2 text-sm text-gray-500 hover:text-[#66fcf1] transition duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>BACK TO SIGN IN</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
