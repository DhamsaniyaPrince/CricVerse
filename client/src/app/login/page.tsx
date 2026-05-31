'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { authStart, authSuccess, authFailure, clearAuthStatus } from '@/store/slices/authSlice';
import api from '@/utils/api';
import { LogIn, Key, Mail, RefreshCw, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // Clear errors when entering the page
  useEffect(() => {
    dispatch(clearAuthStatus());
  }, [dispatch]);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setFormErrors('All fields are required');
      return false;
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setFormErrors('Please enter a valid email address');
      return false;
    }
    setFormErrors(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    dispatch(authStart());
    try {
      const response = await api.post('/auth/login', formData);
      if (response.data.success) {
        dispatch(
          authSuccess({
            user: response.data.data,
            token: response.data.data.token
          })
        );
        router.push('/dashboard');
      } else {
        dispatch(authFailure(response.data.message || 'Login failed'));
      }
    } catch (err: any) {
      console.error(err);
      dispatch(
        authFailure(
          err.response?.data?.message || 'Connection failed. Please ensure the backend is running.'
        )
      );
    }
  };

  const handleGoogleLogin = () => {
    // Simulated Google OAuth Flow
    dispatch(authStart());
    setTimeout(() => {
      // Create a mock player login
      const mockGoogleData = {
        _id: 'mock_google_id_123',
        username: 'Google Cricketer',
        email: formData.email || 'google.cricketer@cricverse.com',
        role: 'player' as const,
        isEmailVerified: true,
        token: 'mocked_google_jwt_token'
      };
      dispatch(authSuccess({ user: mockGoogleData, token: mockGoogleData.token }));
      router.push('/dashboard');
    }, 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-lg w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#66fcf1] to-[#1f2833] flex items-center justify-center font-bold text-[#0b0c10] text-3xl shadow-[0_0_20px_rgba(102,252,241,0.5)]">
            CV
          </div>
          <h2 className="text-3xl font-black tracking-wider text-white">
            WELCOME TO <span className="text-[#66fcf1]">CRICVERSE</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm tracking-wide">ENTER YOUR RUNS, TRACK YOUR STATS</p>
        </div>

        {/* Error notification bar */}
        {(error || formErrors) && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/45 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || formErrors}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email field */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">EMAIL ADDRESS</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="user@example.com"
                className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">PASSWORD</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-gray-500 hover:text-[#66fcf1] transition">
                FORGOT PASSWORD?
              </Link>
            </div>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="password"
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••••••"
                className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
              />
            </div>
          </div>

          {/* Login Action Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold tracking-wide uppercase shadow-lg shadow-[#66fcf1]/25 hover:from-cyan-400 hover:to-cyan-600 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition duration-300 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                <span>SIGN IN TO CV</span>
              </>
            )}
          </button>
        </form>

        {/* Separator line */}
        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#66fcf1]/10"></div>
          </div>
          <span className="relative bg-[#0d1117] px-4 text-xs font-bold text-gray-500 uppercase tracking-widest">
            OR SIGN IN WITH
          </span>
        </div>

        {/* Social auth */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full py-3 rounded-lg border border-gray-700 hover:border-white text-gray-300 hover:text-white font-semibold transition duration-300 flex items-center justify-center space-x-2 bg-[#1f2833]/10"
        >
          <svg className="w-5 h-5 text-red-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.866-3.577-7.866-8s3.536-8 7.866-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.746-.08-1.32-.176-1.886H12.24z"/>
          </svg>
          <span>SIGN IN WITH GOOGLE</span>
        </button>

        {/* Redirect toggle */}
        <p className="mt-8 text-center text-sm text-gray-500">
          NEW TO THE CRICVERSE?{' '}
          <Link href="/register" className="font-bold text-[#66fcf1] hover:underline">
            CREATE AN ACCOUNT
          </Link>
        </p>
      </div>
    </div>
  );
}
