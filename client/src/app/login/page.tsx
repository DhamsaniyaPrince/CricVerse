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

  // If already logged in on the backend, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Handle Google OAuth raw credential verification with Express backend
  const handleGoogleCredentialResponse = async (response: any) => {
    const idToken = response.credential;
    if (!idToken) return;

    dispatch(authStart());
    try {
      const res = await api.post('/auth/google-login', { idToken });
      
      if (res.data.success) {
        if (res.data.exists) {
          // User exists: login success
          dispatch(
            authSuccess({
              user: res.data.data,
              token: res.data.data.token
            })
          );
          router.push('/dashboard');
        } else {
          // First time user: save profile details and redirect to role onboarding selection
          localStorage.setItem('google_profile', JSON.stringify(res.data.googleProfile));
          dispatch(clearAuthStatus());
          router.push('/onboarding');
        }
      } else {
        dispatch(authFailure(res.data.message || 'Google verification failed'));
      }
    } catch (err: any) {
      console.error('Google verify error:', err);
      dispatch(
        authFailure(
          err.response?.data?.message || 'Failed to authenticate with Google. Please try again.'
        )
      );
    }
  };

  // Dynamically initialize and render Google Identity Services button
  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const initGoogleBtn = () => {
      const google = (window as any).google;
      if (google && google.accounts && google.accounts.id) {
        clearInterval(checkInterval);
        
        google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'dummy-client-id',
          callback: handleGoogleCredentialResponse,
        });

        const btnContainer = document.getElementById('google-signin-button');
        if (btnContainer) {
          google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
            size: 'large',
            width: btnContainer.clientWidth || 368,
            text: 'signin_with',
            shape: 'pill',
          });
        }
      }
    };

    // Try immediately
    initGoogleBtn();

    // Periodically poll to ensure script is loaded and DOM container is ready
    checkInterval = setInterval(initGoogleBtn, 300);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, []);

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


  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-md w-full p-8 md:p-10 shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
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
        <div className="flex items-center my-6">
          <div className="flex-grow border-t border-[#66fcf1]/10"></div>
          <span className="px-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">
            OR SIGN IN WITH
          </span>
          <div className="flex-grow border-t border-[#66fcf1]/10"></div>
        </div>

        {/* Social auth */}
        <div className="w-full flex justify-center">
          <div id="google-signin-button" className="w-full min-h-[44px] flex justify-center"></div>
        </div>

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
