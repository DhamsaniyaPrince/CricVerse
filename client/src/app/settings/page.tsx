'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { updateUserProfile } from '@/store/slices/authSlice';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import {
  User,
  Settings,
  Mail,
  Shield,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Bell,
  BellOff,
  Lock
} from 'lucide-react';

export default function SettingsPage() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'security' | 'appearance' | 'preferences'>('profile');

  // Profile fields state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'player' | 'captain' | 'organizer' | 'admin'>('player');
  const [avatar, setAvatar] = useState('');

  // Password fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);



  // Status/Messages
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // App settings preferences (stored locally in localStorage)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Drag over state for dropzone
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields on load
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setRole(user.role || 'player');
      setAvatar(user.avatar || '');
    }

    if (typeof window !== 'undefined') {
      const savedTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
      setTheme(savedTheme);
      const savedSound = localStorage.getItem('sound_enabled') !== 'false';
      setSoundEnabled(savedSound);
      const savedNotify = localStorage.getItem('notify_enabled') !== 'false';
      setNotificationsEnabled(savedNotify);

      const handleThemeChange = () => {
        const currentTheme = (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
        setTheme(currentTheme);
      };
      window.addEventListener('theme-changed', handleThemeChange);
      return () => {
        window.removeEventListener('theme-changed', handleThemeChange);
      };
    }
  }, [user]);

  // Handle image conversion to Base64 with client-side scaling/compression
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setErrorMessage('Unsupported file type. Please upload a PNG, JPG, or GIF image.');
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const img = new Image();
        img.onload = () => {
          // Resize to a square avatar of 300x300 for perfect fit and low size
          const targetSize = 300;
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw image cropped to square from the center
            const sourceSize = Math.min(img.width, img.height);
            const sx = (img.width - sourceSize) / 2;
            const sy = (img.height - sourceSize) / 2;
            
            ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, targetSize, targetSize);
            
            // Get compressed Base64 string (0.75 quality provides high fidelity under 50KB)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
            setAvatar(compressedBase64);
            setSuccessMessage('Avatar uploaded and optimized successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            // Fallback if canvas context fails
            setAvatar(e.target?.result as string);
            setSuccessMessage('Avatar uploaded successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
          }
        };
        img.onerror = () => {
          setAvatar(e.target?.result as string);
          setSuccessMessage('Avatar uploaded successfully!');
          setTimeout(() => setSuccessMessage(null), 3000);
        };
        img.src = e.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  // Support Ctrl+V paste logic
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (activeSubTab === 'profile' && e.clipboardData?.files && e.clipboardData.files.length > 0) {
        processImageFile(e.clipboardData.files[0]);
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [activeSubTab]);

  // Save changes callback
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.put('/auth/updatedetails', {
        username,
        email,
        role,
        avatar
      });

      if (response.data.success) {
        dispatch(updateUserProfile(response.data.data));
        setSuccessMessage('Profile details updated successfully!');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to update profile details');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    
    setPasswordLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await api.put('/auth/updatepassword', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        setSuccessMessage('Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.response?.data?.message || 'Failed to update password');
      setTimeout(() => setErrorMessage(null), 4000);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Toggle Theme Switcher (Updates local storage and element classes immediately)
  const toggleThemeMode = (selectedTheme: 'dark' | 'light') => {

    setTheme(selectedTheme);
    localStorage.setItem('theme', selectedTheme);
    
    if (selectedTheme === 'light') {
      document.body.classList.add('light-mode');
      document.documentElement.classList.add('light-mode');
      document.documentElement.classList.remove('dark');
    } else {
      document.body.classList.remove('light-mode');
      document.documentElement.classList.remove('light-mode');
      document.documentElement.classList.add('dark');
    }
    
    setSuccessMessage(`Theme switched to ${selectedTheme === 'light' ? 'Light' : 'Dark'} Mode!`);
    setTimeout(() => setSuccessMessage(null), 2000);
  };

  // Save app preferences
  const handleSavePreferences = () => {
    localStorage.setItem('sound_enabled', String(soundEnabled));
    localStorage.setItem('notify_enabled', String(notificationsEnabled));
    setSuccessMessage('Preferences updated successfully!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0b0c10] overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Header info card */}
            <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/10 flex flex-col md:flex-row items-center justify-between gap-6 relative">
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-[#66fcf1]/10 rounded-2xl text-[#66fcf1]">
                  <Settings className="w-8 h-8 text-[#66fcf1]" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white uppercase tracking-wider">Settings Manager</h1>
                  <p className="text-gray-400 text-sm mt-0.5">Customize your account, appearances, preferences, and details.</p>
                </div>
              </div>
            </div>

            {/* Notification toasts */}
            {successMessage && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-sm flex items-center space-x-3 shadow-lg shadow-emerald-500/5">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-red-400 text-sm flex items-center space-x-3 shadow-lg shadow-red-500/5">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Main settings settings splits */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {/* Tab options sidepanel */}
              <div className="lg:col-span-1 flex flex-row lg:flex-col gap-2 overflow-x-auto pb-3 lg:pb-0">
                <button
                  onClick={() => setActiveSubTab('profile')}
                  className={`flex-1 lg:flex-none text-left px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition duration-200 flex items-center space-x-2.5 focus:outline-none ${
                    activeSubTab === 'profile'
                      ? 'bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/20'
                      : 'text-gray-400 bg-white/5 border border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <User className="w-4.5 h-4.5" />
                  <span>Account details</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('security')}
                  className={`flex-1 lg:flex-none text-left px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition duration-200 flex items-center space-x-2.5 focus:outline-none ${
                    activeSubTab === 'security'
                      ? 'bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/20'
                      : 'text-gray-400 bg-white/5 border border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Lock className="w-4.5 h-4.5" />
                  <span>Security & Password</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('appearance')}
                  className={`flex-1 lg:flex-none text-left px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition duration-200 flex items-center space-x-2.5 focus:outline-none ${
                    activeSubTab === 'appearance'
                      ? 'bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/20'
                      : 'text-gray-400 bg-white/5 border border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Sun className="w-4.5 h-4.5" />
                  <span>Theme & appearance</span>
                </button>
                <button
                  onClick={() => setActiveSubTab('preferences')}
                  className={`flex-1 lg:flex-none text-left px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-xs transition duration-200 flex items-center space-x-2.5 focus:outline-none ${
                    activeSubTab === 'preferences'
                      ? 'bg-[#66fcf1]/10 text-[#66fcf1] border border-[#66fcf1]/20'
                      : 'text-gray-400 bg-white/5 border border-transparent hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Bell className="w-4.5 h-4.5" />
                  <span>App Preferences</span>
                </button>
              </div>


              {/* Setting views container */}
              <div className="lg:col-span-3">
                {/* 1. Account Details Profile Form */}
                {activeSubTab === 'profile' && (
                  <form onSubmit={handleSaveProfile} className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
                    <div className="border-b border-white/5 pb-4 mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">Account profile details</h3>
                      <p className="text-gray-500 text-xs mt-1">Configure your personal information and profile photo.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Drag, drop and paste Avatar Dropzone */}
                      <div className="md:col-span-1 flex flex-col items-center justify-start space-y-4">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block self-start">
                          Profile Avatar
                        </label>
                        
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={`w-36 h-36 rounded-3xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 relative overflow-hidden group select-none ${
                            isDragOver 
                              ? 'border-[#66fcf1] bg-[#66fcf1]/10 shadow-[0_0_15px_rgba(102,252,241,0.2)]'
                              : avatar 
                              ? 'border-[#66fcf1]/30 hover:border-[#66fcf1]'
                              : 'border-white/15 hover:border-white/30 bg-[#0b0c10]/40'
                          }`}
                        >
                          {avatar ? (
                            <>
                              <img src={avatar} alt="Profile preview" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-[#0b0c10]/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center text-[#66fcf1] text-[10px] uppercase font-bold tracking-wider space-y-1">
                                <Upload className="w-5 h-5 text-[#66fcf1]" />
                                <span>Change image</span>
                              </div>
                            </>
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <Upload className="w-6 h-6 text-gray-500 mx-auto" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                                Drag image here or paste
                              </p>
                              <span className="text-[8px] text-gray-600 block">
                                Ctrl+C / Ctrl+V
                              </span>
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <p className="text-[9px] text-gray-500 text-center max-w-[150px]">
                          Accepts PNG, JPG, or base64 images. Drop anywhere inside target or paste from clipboard.
                        </p>
                      </div>

                      {/* User Input details */}
                      <div className="md:col-span-2 space-y-4">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                            Username / Cricketer name
                          </label>
                          <div className="relative">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input
                              type="text"
                              required
                              value={username}
                              onChange={(e) => setUsername(e.target.value)}
                              className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                            Email Address
                          </label>
                          <div className="relative">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                            User Role Selection
                          </label>
                          <div className="relative">
                            <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                            <select
                              value={role}
                              onChange={(e: any) => setRole(e.target.value)}
                              className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                            >
                               <option value="player" className="bg-[#0b0c10]">Player</option>
                               <option value="captain" className="bg-[#0b0c10]">Team Manager</option>
                               <option value="organizer" className="bg-[#0b0c10]">Tournament Organizer</option>
                               <option value="admin" className="bg-[#0b0c10]">System Administrator</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 disabled:opacity-50 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider transition duration-200 flex items-center justify-center space-x-2"
                          >
                            {loading ? (
                              <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Saving changes...</span>
                              </>
                            ) : (
                              <span>Save account profile</span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}

                {/* 1.5. Security & Password Form */}
                {activeSubTab === 'security' && (
                  <form onSubmit={handleUpdatePassword} className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
                    <div className="border-b border-white/5 pb-4 mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">Update password</h3>
                      <p className="text-gray-500 text-xs mt-1">Ensure your account is using a long, secure password.</p>
                    </div>

                    <div className="space-y-4 max-w-xl">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                          Current Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                          <input
                            type="password"
                            required
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                          New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                          <input
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                          <input
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full bg-[#0b0c10]/60 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-[#66fcf1]/50"
                          />
                        </div>
                      </div>

                      <div className="pt-4">
                        <button
                          type="submit"
                          disabled={passwordLoading}
                          className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 disabled:opacity-50 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider transition duration-200 flex items-center justify-center space-x-2"
                        >
                          {passwordLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <span>Change Password</span>
                          )}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* 2. Theme & Appearance Selector */}
                {activeSubTab === 'appearance' && (

                  <div className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
                    <div className="border-b border-white/5 pb-4 mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">App theme settings</h3>
                      <p className="text-gray-500 text-xs mt-1">Select theme scheme for the CricVerse web experience.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Dark Mode Card selection */}
                      <div
                        onClick={() => toggleThemeMode('dark')}
                        className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between h-40 relative group ${
                          theme === 'dark'
                            ? 'border-[#66fcf1] bg-[#1f2833]/30 shadow-[0_0_20px_rgba(102,252,241,0.15)]'
                            : 'border-white/5 bg-[#0b0c10]/40 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 bg-black/40 rounded-xl text-[#66fcf1]">
                            <Moon className="w-5 h-5 text-[#66fcf1]" />
                          </div>
                          {theme === 'dark' && (
                            <span className="text-[8px] font-bold text-[#66fcf1] border border-[#66fcf1]/45 px-2 py-0.5 rounded uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-wider">Neon Cyber Dark</h4>
                          <p className="text-gray-500 text-[10px] mt-1">Dark mode with glassmorphic cards and bright cyan/pink highlights.</p>
                        </div>
                      </div>

                      {/* Light Mode Card selection */}
                      <div
                        onClick={() => toggleThemeMode('light')}
                        className={`p-5 rounded-2xl cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between h-40 relative group ${
                          theme === 'light'
                            ? 'border-cyan-600 bg-white shadow-xl shadow-cyan-600/5'
                            : 'border-white/5 bg-[#0b0c10]/40 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="p-2.5 bg-cyan-100 rounded-xl text-cyan-600">
                            <Sun className="w-5 h-5 text-cyan-600" />
                          </div>
                          {theme === 'light' && (
                            <span className="text-[8px] font-bold text-cyan-600 border border-cyan-600/45 px-2 py-0.5 rounded uppercase tracking-wider">
                              Active
                            </span>
                          )}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Classic Sport Light</h4>
                          <p className="text-slate-500 text-[10px] mt-1">Pure clean light theme focusing on typography and high contrast charts.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. General App Preferences Toggles */}
                {activeSubTab === 'preferences' && (
                  <div className="glass-card p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
                    <div className="border-b border-white/5 pb-4 mb-6">
                      <h3 className="text-md font-bold uppercase tracking-wider text-white">General app preferences</h3>
                      <p className="text-gray-500 text-xs mt-1">Customize match alerts, sounds, and scoring configurations.</p>
                    </div>

                    <div className="space-y-5">
                      {/* Notifications Alert Toggle */}
                      <div className="flex items-center justify-between p-4 bg-[#0b0c10]/30 rounded-xl border border-white/5">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${notificationsEnabled ? 'bg-[#66fcf1]/10 text-[#66fcf1]' : 'bg-gray-800 text-gray-500'}`}>
                            {notificationsEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs uppercase tracking-wide">Live Match Notifications</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">Receive alerts when wickets fall, boundaries are hit, or matches finish.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                          className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                            notificationsEnabled ? 'bg-[#66fcf1]' : 'bg-gray-800'
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded-full bg-[#0b0c10] transition-transform duration-200 ${
                              notificationsEnabled ? 'translate-x-5.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Sound effects Toggle */}
                      <div className="flex items-center justify-between p-4 bg-[#0b0c10]/30 rounded-xl border border-white/5">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-pink-500/10 text-pink-400' : 'bg-gray-800 text-gray-500'}`}>
                            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs uppercase tracking-wide">Scoring Sound Effects</p>
                            <p className="text-gray-500 text-[10px] mt-0.5">Play cricket sounds (ball hit, crowd cheers) when score counts update.</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSoundEnabled(!soundEnabled)}
                          className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                            soundEnabled ? 'bg-[#66fcf1]' : 'bg-gray-800'
                          }`}
                        >
                          <div
                            className={`w-4.5 h-4.5 rounded-full bg-[#0b0c10] transition-transform duration-200 ${
                              soundEnabled ? 'translate-x-5.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="pt-4 border-t border-white/5">
                        <button
                          onClick={handleSavePreferences}
                          className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black uppercase text-xs rounded-xl tracking-wider transition duration-200 shadow-lg shadow-purple-500/10"
                        >
                          Save Preferences
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
