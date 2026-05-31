'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { User, LogOut, ChevronDown, Activity, Award, Trophy, UserPlus, Menu } from 'lucide-react';

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0b0c10]/75 backdrop-blur-md border-b border-[#66fcf1]/10 px-4 md:px-8 py-4 flex items-center justify-between">
      {/* Brand logo & mobile trigger */}
      <div className="flex items-center space-x-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden text-gray-400 hover:text-[#66fcf1] focus:outline-none"
          >
            <Menu className="w-6 h-6" />
          </button>
        )}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#66fcf1] to-[#1f2833] flex items-center justify-center font-bold text-[#0b0c10] text-xl shadow-[0_0_15px_rgba(102,252,241,0.4)] group-hover:scale-105 transition duration-300">
            CV
          </div>
          <span className="text-2xl font-black tracking-wider text-white">
            CRIC<span className="text-[#66fcf1] group-hover:text-cyan-300 transition duration-300">VERSE</span>
          </span>
        </Link>
      </div>

      {/* Center Links (Desktop only) */}
      <div className="hidden md:flex items-center space-x-8 text-sm font-semibold tracking-wider">
        <Link href="/" className="text-gray-300 hover:text-[#66fcf1] hover:neon-text-cyan transition duration-300 flex items-center space-x-1">
          <Activity className="w-4 h-4 text-[#39ff14] animate-pulse" />
          <span>LIVE MATCHES</span>
        </Link>
        <Link href="/tournaments" className="text-gray-300 hover:text-[#66fcf1] transition duration-300 flex items-center space-x-1">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>TOURNAMENTS</span>
        </Link>
        <Link href="/players" className="text-gray-300 hover:text-[#66fcf1] transition duration-300 flex items-center space-x-1">
          <User className="w-4 h-4 text-blue-500" />
          <span>PLAYERS</span>
        </Link>
        <Link href="/teams" className="text-gray-300 hover:text-[#66fcf1] transition duration-300 flex items-center space-x-1">
          <Award className="w-4 h-4 text-purple-500" />
          <span>TEAMS</span>
        </Link>
      </div>

      {/* Right side auth options */}
      <div className="flex items-center space-x-4">
        {mounted && isAuthenticated && user ? (
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-2 bg-[#1f2833]/60 hover:bg-[#1f2833] border border-[#66fcf1]/20 py-1.5 px-3 rounded-full transition duration-300 focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-[#66fcf1]/20 flex items-center justify-center font-bold text-[#66fcf1]">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="hidden lg:block text-left text-xs pr-1">
                <p className="font-semibold text-white max-w-[80px] truncate">{user.username}</p>
                <p className="text-gray-400 uppercase font-bold text-[9px] tracking-widest">{user.role}</p>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-xl bg-[#0b0c10] border border-[#66fcf1]/20 p-2 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-[#66fcf1]/10 mb-1 lg:hidden">
                  <p className="font-semibold text-white truncate">{user.username}</p>
                  <p className="text-[#66fcf1] uppercase font-bold text-[9px] tracking-widest">{user.role}</p>
                </div>
                <Link
                  href="/dashboard"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1f2833] hover:text-[#66fcf1] transition duration-200"
                >
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-200 text-left"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        ) : mounted ? (
          <div className="flex items-center space-x-3 text-sm">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-300 hover:text-[#66fcf1] font-semibold transition duration-300"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-[#66fcf1] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 text-[#0b0c10] font-bold rounded-lg shadow-lg shadow-[#66fcf1]/25 hover:scale-[1.03] transition duration-300"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register</span>
            </Link>
          </div>
        ) : (
          <div className="h-10 w-24"></div>
        )}
      </div>
    </nav>
  );
}
