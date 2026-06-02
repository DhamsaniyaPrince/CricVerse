'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { LayoutDashboard, Activity, Trophy, Users, Shield, Compass, BookOpen, Settings, Award } from 'lucide-react';

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, authRequired: true },
    { name: 'Live Scores', path: '/', icon: Activity },
    { name: 'Leaderboard', path: '/leaderboard', icon: Award },
    { name: 'Tournaments', path: '/tournaments', icon: Trophy },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Players', path: '/players', icon: Users },
    { name: 'Settings', path: '/settings', icon: Settings, authRequired: true },
  ];

  // Scorer/Admin paths
  const adminItems = [
    { name: 'Scoring Control', path: '/admin', icon: Shield, roles: ['organizer', 'admin'] },
    { name: 'Admin Dashboard', path: '/admin-dashboard', icon: Settings, roles: ['admin'] }
  ];

  const handleLinkClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside
      className={`fixed md:sticky top-[73px] left-0 h-[calc(100vh-73px)] w-64 bg-[#1f2833]/20 backdrop-blur-md border-r border-[#66fcf1]/10 px-4 py-6 z-40 transition-transform duration-300 md:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full justify-between">
        {/* Navigation list */}
        <div className="space-y-6">
          <div>
            <p className="text-xs uppercase font-bold text-gray-500 tracking-widest px-3 mb-3">CRICKET CENTER</p>
            <div className="space-y-1">
              {menuItems.map((item) => {
                if (item.authRequired && (!mounted || !isAuthenticated)) return null;
                const Icon = item.icon;
                const isActive = pathname === item.path;
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={handleLinkClick}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition duration-200 ${
                      isActive
                        ? 'bg-[#66fcf1]/10 text-[#66fcf1] border-l-2 border-[#66fcf1]'
                        : 'text-gray-400 hover:bg-[#1f2833]/40 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin panel / Scorer access */}
          {mounted && isAuthenticated && user && (user.role === 'admin' || user.role === 'organizer') && (
            <div>
              <p className="text-xs uppercase font-bold text-gray-500 tracking-widest px-3 mb-3">OFFICIALS PANEL</p>
              <div className="space-y-1">
                {adminItems.map((item) => {
                  if (item.roles && !item.roles.includes(user.role)) return null;
                  const Icon = item.icon;
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={handleLinkClick}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition duration-200 ${
                        isActive
                          ? 'bg-purple-500/10 text-purple-400 border-l-2 border-purple-500'
                          : 'text-gray-400 hover:bg-purple-950/20 hover:text-white'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-purple-500" />
                      <span className="text-sm">{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer note in sidebar */}
        <div className="border-t border-[#66fcf1]/10 pt-4">
          <div className="glass-card p-3 text-center text-xs border-cyan-500/5">
            <span className="text-[#66fcf1] font-bold block mb-1">CricVerse v1.0</span>
            <span className="text-gray-500 block">Real-time Cricket Ecosystem</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
