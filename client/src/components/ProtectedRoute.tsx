'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('player' | 'captain' | 'organizer' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useSelector((state: RootState) => state.auth);
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router, mounted]);

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="relative flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-[#66fcf1]/20 border-t-[#66fcf1] rounded-full animate-spin"></div>
          <p className="mt-4 text-[#66fcf1] font-medium tracking-wide animate-pulse">VERIFYING SESSION...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center neon-glow-magenta border-red-500/30">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-white mb-2">ACCESS DENIED</h2>
          <p className="text-gray-400 mb-6">
            Your account role (<span className="text-[#66fcf1] font-semibold uppercase">{user.role}</span>) does not have permission to view this section.
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-3 px-6 rounded-lg bg-gradient-to-r from-red-600 to-red-800 text-white font-semibold hover:from-red-500 hover:to-red-700 transition duration-300 transform hover:scale-[1.02] shadow-lg shadow-red-900/35"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
