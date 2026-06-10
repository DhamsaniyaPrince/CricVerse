'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { io } from 'socket.io-client';
import api from '@/utils/api';
import {
  User,
  LogOut,
  ChevronDown,
  Activity,
  Award,
  Trophy,
  UserPlus,
  Menu,
  Settings,
  Bell,
  Trash,
  CheckCheck,
  Sun,
  Moon
} from 'lucide-react';

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Navbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  
  // Notification states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
      setTheme(savedTheme);
      if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        document.documentElement.classList.add('light-mode');
        document.documentElement.classList.remove('dark');
      } else {
        document.body.classList.remove('light-mode');
        document.documentElement.classList.remove('light-mode');
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.body.classList.add('light-mode');
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
    window.dispatchEvent(new Event('theme-changed'));
  };
  const [unreadCount, setUnreadCount] = useState(0);

  const notiRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      if (response.data.success) {
        setNotifications(response.data.data || []);
        const unread = (response.data.data || []).filter((n: NotificationItem) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    if (mounted && isAuthenticated && user) {
      fetchNotifications();

      // Connect to Socket.io for user private room
      const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://process.env.REACT_APP_API_URLgit status', {
        transports: ['websocket'],
        upgrade: false
      });

      socket.on('connect', () => {
        socket.emit('join_user_room', user._id);
      });

      socket.on('notification:new', (newNoti: NotificationItem) => {
        setNotifications(prev => [newNoti, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [mounted, isAuthenticated, user?._id]);

  // Handle outside clicks to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setNotiOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    router.push('/login');
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await api.put('/notifications/read-all');
      if (response.data.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking all notifications read:', err);
    }
  };

  const handleMarkRead = async (notiId: string) => {
    try {
      const response = await api.put(`/notifications/${notiId}/read`);
      if (response.data.success) {
        setNotifications(prev =>
          prev.map(n => (n._id === notiId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    }
  };

  const handleDeleteNoti = async (notiId: string) => {
    try {
      const response = await api.delete(`/notifications/${notiId}`);
      if (response.data.success) {
        const target = notifications.find(n => n._id === notiId);
        setNotifications(prev => prev.filter(n => n._id !== notiId));
        if (target && !target.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const getNotiIcon = (type: string) => {
    switch (type) {
      case 'match_created':
      case 'match_updated':
        return <Activity className="w-4 h-4 text-emerald-400" />;
      case 'match_completed':
        return <Award className="w-4 h-4 text-blue-400" />;
      case 'team_approved':
        return <User className="w-4 h-4 text-purple-400" />;
      case 'tournament_started':
      case 'tournament_ended':
        return <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />;
      default:
        return <Bell className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#0b0c10]/75 backdrop-blur-md border-b border-[#66fcf1]/10 px-4 md:px-8 py-4 flex items-center justify-between">
      {/* Brand logo & mobile trigger */}
      <div className="flex items-center space-x-3">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden text-gray-400 hover:text-[#66fcf1] focus:outline-none"
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
      <div className="hidden lg:flex items-center space-x-8 text-sm font-semibold tracking-wider">
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

      {/* Right side auth & notifications */}
      <div className="flex items-center space-x-4">
        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full bg-[#1f2833]/40 border border-white/5 text-gray-400 hover:text-[#66fcf1] transition duration-200 focus:outline-none cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-indigo-400" />
            )}
          </button>
        )}

        {mounted && isAuthenticated && user ? (
          <div className="flex items-center space-x-4">
            
            {/* Notification Bell */}
            <div className="relative" ref={notiRef}>
              <button
                onClick={() => setNotiOpen(!notiOpen)}
                className="relative p-2.5 rounded-full bg-[#1f2833]/40 border border-white/5 text-gray-400 hover:text-[#66fcf1] transition duration-200 focus:outline-none"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-black text-white shadow-lg border border-red-500 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notiOpen && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl bg-[#0b0c10]/95 backdrop-blur-md border border-[#66fcf1]/20 shadow-2xl p-4 z-50 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#66fcf1]/10 pb-2.5">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] font-mono">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[9px] uppercase font-bold text-gray-400 hover:text-white flex items-center space-x-1 transition"
                      >
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Read all</span>
                      </button>
                    )}
                  </div>

                  <div className="max-h-72 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                    {notifications.map(n => (
                      <div
                        key={n._id}
                        onClick={() => !n.isRead && handleMarkRead(n._id)}
                        className={`p-3 rounded-xl border flex gap-3 items-start transition cursor-pointer relative ${
                          n.isRead
                            ? 'bg-[#1f2833]/15 border-white/5 opacity-60 hover:opacity-100'
                            : 'bg-[#66fcf1]/5 border-[#66fcf1]/15 hover:bg-[#66fcf1]/10'
                        }`}
                      >
                        <div className="p-2 rounded-lg bg-black/40 flex-shrink-0">
                          {getNotiIcon(n.type)}
                        </div>
                        <div className="flex-1 min-w-0 pr-6">
                          <h5 className="font-bold text-white text-xs leading-snug">{n.title}</h5>
                          <p className="text-[10px] text-gray-400 mt-1 leading-normal break-words">{n.message}</p>
                          <span className="text-[8px] font-mono text-gray-500 block mt-1.5">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Action buttons inside item */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNoti(n._id);
                          }}
                          className="absolute top-3 right-3 text-gray-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition"
                        >
                          <Trash className="w-3 h-3" />
                        </button>
                      </div>
                    ))}

                    {notifications.length === 0 && (
                      <div className="py-12 text-center text-gray-600 text-xs italic font-medium">
                        Inbox empty. No notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative" ref={userRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 bg-[#1f2833]/60 hover:bg-[#1f2833] border border-[#66fcf1]/20 py-1.5 px-3 rounded-full transition duration-300 focus:outline-none"
              >
                <div className="w-8 h-8 rounded-full bg-[#66fcf1]/20 flex items-center justify-center font-bold text-[#66fcf1] overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    user.username.charAt(0).toUpperCase()
                  )}
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
                  {user.role === 'admin' && (
                    <Link
                      href="/admin-dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-950/20 hover:text-red-300 transition duration-200"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Admin Panel</span>
                    </Link>
                  )}
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1f2833] hover:text-[#66fcf1] transition duration-200"
                  >
                    <User className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-[#1f2833] hover:text-[#66fcf1] transition duration-200"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
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
