'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { authSuccess, authFailure, authStart, clearAuthStatus } from '@/store/slices/authSlice';
import api from '@/utils/api';
import { User, Shield, ArrowRight, RefreshCw, AlertCircle, Users } from 'lucide-react';

interface GoogleProfile {
  name: string;
  email: string;
  googleId: string;
  avatar: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, isLoading, error } = useSelector((state: RootState) => state.auth);

  const [googleProfile, setGoogleProfile] = useState<GoogleProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<'player' | 'captain' | 'organizer' | 'admin' | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Load Google profile details from localStorage
  useEffect(() => {
    dispatch(clearAuthStatus());
    const storedProfile = localStorage.getItem('google_profile');
    if (storedProfile) {
      try {
        setGoogleProfile(JSON.parse(storedProfile));
      } catch (e) {
        console.error('Failed to parse google profile:', e);
        router.push('/login');
      }
    } else {
      // If no profile data, send back to login
      router.push('/login');
    }
  }, [router, dispatch]);

  // Redirect to dashboard if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  const handleRoleSelect = (role: 'player' | 'captain' | 'organizer' | 'admin') => {
    setSelectedRole(role);
    setFormError(null);
  };

  const handleContinue = async () => {
    if (!googleProfile) {
      router.push('/login');
      return;
    }

    if (!selectedRole) {
      setFormError('Please select a role to continue.');
      return;
    }

    dispatch(authStart());
    try {
      const response = await api.post('/auth/google-register', {
        name: googleProfile.name,
        email: googleProfile.email,
        googleId: googleProfile.googleId,
        avatar: googleProfile.avatar,
        role: selectedRole
      });

      if (response.data.success) {
        // Clear temp google profile from localStorage
        localStorage.removeItem('google_profile');

        dispatch(
          authSuccess({
            user: response.data.data,
            token: response.data.data.token
          })
        );
        router.push('/dashboard');
      } else {
        dispatch(authFailure(response.data.message || 'Onboarding failed'));
      }
    } catch (err: any) {
      console.error('Onboarding registration error:', err);
      dispatch(
        authFailure(
          err.response?.data?.message || 'Failed to complete registration onboarding. Please try again.'
        )
      );
    }
  };

  if (!googleProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <RefreshCw className="w-8 h-8 animate-spin text-[#66fcf1]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0b0c10] px-4 py-8 md:py-16 relative overflow-x-hidden overflow-y-auto">
      {/* Visual background accents */}
      <div className="absolute top-[-25%] left-[-25%] w-[70%] h-[70%] rounded-full bg-[#66fcf1]/5 blur-[130px]"></div>
      <div className="absolute bottom-[-25%] right-[-25%] w-[70%] h-[70%] rounded-full bg-purple-500/5 blur-[130px]"></div>

      <div className="glass-card max-w-5xl w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-[#66fcf1] to-[#1f2833] flex items-center justify-center font-bold text-[#0b0c10] text-2xl shadow-[0_0_20px_rgba(102,252,241,0.4)]">
            CV
          </div>
          <h2 className="text-3xl font-black tracking-wider text-white uppercase">
            Welcome to <span className="text-[#66fcf1]">CricVerse</span>
          </h2>
          <p className="text-gray-400 mt-2 text-sm max-w-md mx-auto">
            Hi <span className="text-white font-semibold">{googleProfile.name}</span>, your Google account is authenticated! Please select your role to complete sign up.
          </p>
        </div>

        {/* Status notifications */}
        {(error || formError) && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/45 border border-red-500/30 flex items-start space-x-3 text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error || formError}</span>
          </div>
        )}

        {/* Role Cards Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* 1. Player Card */}
          <div
            onClick={() => handleRoleSelect('player')}
            className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center min-h-[280px] md:h-80 justify-between group ${
              selectedRole === 'player'
                ? 'border-[#66fcf1] bg-[#1f2833]/30 shadow-[0_0_25px_rgba(102,252,241,0.2)]'
                : 'border-white/5 bg-[#0b0c10]/40 hover:border-[#66fcf1]/30 hover:bg-[#1f2833]/10'
            }`}
          >
            <div className={`p-3 rounded-xl transition duration-300 ${
              selectedRole === 'player' ? 'bg-[#66fcf1]/15 text-[#66fcf1]' : 'bg-white/5 text-gray-400 group-hover:text-white'
            }`}>
              <User className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5 mt-2 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">Cricketer / Player</h3>
              <p className="text-[11px] text-gray-500 leading-normal">
                Join squads, log stats, view your career charts, and climb the leaderboard.
              </p>
            </div>
            
            <div className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mt-3 transition duration-300 ${
              selectedRole === 'player' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'bg-white/5 text-gray-500'
            }`}>
              {selectedRole === 'player' ? 'Selected' : 'Select'}
            </div>
          </div>

          {/* 2. Team Manager Card */}
          <div
            onClick={() => handleRoleSelect('captain')}
            className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center min-h-[280px] md:h-80 justify-between group ${
              selectedRole === 'captain'
                ? 'border-[#39ff14] bg-[#39ff14]/5 shadow-[0_0_25px_rgba(57,255,20,0.15)]'
                : 'border-white/5 bg-[#0b0c10]/40 hover:border-[#39ff14]/30 hover:bg-[#1f2833]/10'
            }`}
          >
            <div className={`p-3 rounded-xl transition duration-300 ${
              selectedRole === 'captain' ? 'bg-[#39ff14]/15 text-[#39ff14]' : 'bg-white/5 text-gray-400 group-hover:text-white'
            }`}>
              <Users className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5 mt-2 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">Team Manager</h3>
              <p className="text-[11px] text-gray-500 leading-normal">
                Manage squad rosters, add/remove players, and view your team dashboard.
              </p>
            </div>
            
            <div className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mt-3 transition duration-300 ${
              selectedRole === 'captain' ? 'bg-[#39ff14] text-[#0b0c10]' : 'bg-white/5 text-gray-500'
            }`}>
              {selectedRole === 'captain' ? 'Selected' : 'Select'}
            </div>
          </div>

          {/* 3. Organizer Card */}
          <div
            onClick={() => handleRoleSelect('organizer')}
            className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center min-h-[280px] md:h-80 justify-between group ${
              selectedRole === 'organizer'
                ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_25px_rgba(168,85,247,0.2)]'
                : 'border-white/5 bg-[#0b0c10]/40 hover:border-purple-500/30 hover:bg-[#1f2833]/10'
            }`}
          >
            <div className={`p-3 rounded-xl transition duration-300 ${
              selectedRole === 'organizer' ? 'bg-purple-500/15 text-purple-400' : 'bg-white/5 text-gray-400 group-hover:text-white'
            }`}>
              <Shield className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5 mt-2 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">Organizer</h3>
              <p className="text-[11px] text-gray-500 leading-normal">
                Create leagues, organize brackets, manage fixtures, and approve matches.
              </p>
            </div>
            
            <div className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mt-3 transition duration-300 ${
              selectedRole === 'organizer' ? 'bg-purple-500 text-white' : 'bg-white/5 text-gray-500'
            }`}>
              {selectedRole === 'organizer' ? 'Selected' : 'Select'}
            </div>
          </div>

          {/* 4. Administrator Card */}
          <div
            onClick={() => handleRoleSelect('admin')}
            className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col items-center text-center min-h-[280px] md:h-80 justify-between group ${
              selectedRole === 'admin'
                ? 'border-red-500 bg-red-950/20 shadow-[0_0_25px_rgba(239,68,68,0.2)]'
                : 'border-white/5 bg-[#0b0c10]/40 hover:border-red-500/30 hover:bg-[#1f2833]/10'
            }`}
          >
            <div className={`p-3 rounded-xl transition duration-300 ${
              selectedRole === 'admin' ? 'bg-red-500/15 text-red-400' : 'bg-white/5 text-gray-400 group-hover:text-white'
            }`}>
              <Shield className="w-8 h-8" />
            </div>
            
            <div className="space-y-1.5 mt-2 flex-1 flex flex-col justify-center">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider leading-tight">System Admin</h3>
              <p className="text-[11px] text-gray-500 leading-normal">
                Access full system configuration, manage users, and supervise all platform leagues.
              </p>
            </div>
            
            <div className={`text-[9px] uppercase font-bold tracking-widest px-3 py-1 rounded-full mt-3 transition duration-300 ${
              selectedRole === 'admin' ? 'bg-red-500 text-white' : 'bg-white/5 text-gray-500'
            }`}>
              {selectedRole === 'admin' ? 'Selected' : 'Select'}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleContinue}
          disabled={isLoading || !selectedRole}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-[#66fcf1] to-cyan-500 disabled:from-gray-800 disabled:to-gray-800 disabled:opacity-50 text-[#0b0c10] font-black tracking-widest uppercase hover:scale-[1.01] active:scale-[0.99] transition duration-200 flex items-center justify-center space-x-2.5 shadow-lg shadow-[#66fcf1]/10"
        >
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>CONTINUE TO DASHBOARD</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
