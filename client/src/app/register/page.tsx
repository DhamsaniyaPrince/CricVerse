'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { authStart, authSuccess, authFailure, setSuccessMessage, clearAuthStatus } from '@/store/slices/authSlice';
import api from '@/utils/api';
import { UserPlus, User, Key, Mail, Shield, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error, successMessage } = useSelector((state: RootState) => state.auth);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'player'
  });
  const [formErrors, setFormErrors] = useState<string | null>(null);

  useEffect(() => {
    dispatch(clearAuthStatus());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (!formData.username || !formData.email || !formData.password) {
      setFormErrors('All fields are required');
      return false;
    }
    if (formData.username.length < 3) {
      setFormErrors('Username must be at least 3 characters');
      return false;
    }
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(formData.email)) {
      setFormErrors('Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      setFormErrors('Password must be at least 6 characters');
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
      const response = await api.post('/auth/register', formData);
      if (response.data.success) {
        dispatch(setSuccessMessage(response.data.message));
        
        // Log in immediately
        dispatch(
          authSuccess({
            user: response.data.data,
            token: response.data.data.token
          })
        );
        
        // Push notification of the mock verification token
        if (response.data.verificationToken) {
          console.log(`Verification Token Generated: ${response.data.verificationToken}`);
        }
        
        router.push('/dashboard');
      } else {
        dispatch(authFailure(response.data.message || 'Registration failed'));
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 py-12 relative overflow-hidden">
      {/* Background visual accents */}
      <div className="absolute top-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-lg w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#66fcf1] to-[#1f2833] flex items-center justify-center font-bold text-[#0b0c10] text-3xl shadow-[0_0_20px_rgba(102,252,241,0.5)]">
            CV
          </div>
          <h2 className="text-3xl font-black tracking-wider text-white">
            JOIN <span className="text-[#66fcf1]">CRICVERSE</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm tracking-wide">CREATE AN ACCOUNT & START ANALYZING</p>
        </div>

        {/* Status notification bar */}
        {(error || formErrors) && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/45 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || formErrors}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-emerald-950/45 border border-emerald-500/30 flex items-start space-x-3 text-emerald-300 text-sm">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">USERNAME</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                type="text"
                name="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="cricket_star"
                className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
              />
            </div>
          </div>

          {/* Email */}
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
                placeholder="user@cricverse.com"
                className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 transition"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">PASSWORD</label>
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

          {/* Role Selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[#66fcf1]">SELECT ACCOUNT ROLE</label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/10 rounded-lg py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#66fcf1]/50 focus:bg-[#1f2833]/50 appearance-none cursor-pointer transition"
              >
                <option value="player" className="bg-[#0b0c10]">Player (Default)</option>
                <option value="captain" className="bg-[#0b0c10]">Captain (Manage Team)</option>
                <option value="organizer" className="bg-[#0b0c10]">Organizer (Create Tournaments)</option>
                <option value="admin" className="bg-[#0b0c10]">Administrator</option>
              </select>
            </div>
          </div>

          {/* Register Action Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 rounded-lg bg-gradient-to-r from-[#66fcf1] to-cyan-500 text-[#0b0c10] font-bold tracking-wide uppercase shadow-lg shadow-[#66fcf1]/25 hover:from-cyan-400 hover:to-cyan-600 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition duration-300 flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <UserPlus className="w-5 h-5" />
                <span>REGISTER ON CV</span>
              </>
            )}
          </button>
        </form>

        {/* Redirect toggle */}
        <p className="mt-8 text-center text-sm text-gray-500">
          ALREADY HAVE AN ACCOUNT?{' '}
          <Link href="/login" className="font-bold text-[#66fcf1] hover:underline">
            SIGN IN INSTEAD
          </Link>
        </p>
      </div>
    </div>
  );
}
