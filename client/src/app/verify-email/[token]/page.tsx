'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/utils/api';
import { CheckCircle, AlertCircle, RefreshCw, LogIn } from 'lucide-react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const params = useParams();
  const token = params?.token as string;
  const verifiedRef = useRef(false);

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email coordinates in the CricVerse...');

  useEffect(() => {
    if (!token || verifiedRef.current) return;
    verifiedRef.current = true;

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        if (response.data.success) {
          setStatus('success');
          setMessage(response.data.message || 'Email verified successfully!');
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Verification failed');
        }
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setMessage(err.response?.data?.message || 'Verification token is invalid or has expired.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4 relative overflow-hidden">
      {/* Background visual graphics */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-[#66fcf1]/5 blur-[120px]"></div>
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-[#ff007f]/5 blur-[120px]"></div>

      <div className="glass-card max-w-md w-full p-8 md:p-10 text-center shadow-2xl relative z-10 neon-glow-cyan border-[#66fcf1]/20">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black tracking-wider text-white uppercase">
            EMAIL <span className="text-[#66fcf1]">VERIFICATION</span>
          </h2>
        </div>

        {status === 'loading' && (
          <div className="py-8 space-y-4">
            <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin mx-auto" />
            <p className="text-gray-400 text-sm tracking-wide">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6 space-y-6">
            <CheckCircle className="w-16 h-16 text-[#39ff14] mx-auto animate-bounce" />
            <p className="text-white font-bold">{message}</p>
            <p className="text-gray-400 text-xs">
              Your account email has been confirmed. You now have full access to CricVerse matches, stats, and tools.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-bold transition duration-200"
            >
              <LogIn className="w-5 h-5" />
              <span>LOG IN TO YOUR ACCOUNT</span>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6 space-y-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto animate-pulse" />
            <p className="text-red-400 font-bold">{message}</p>
            <p className="text-gray-400 text-xs">
              If you believe this is an error, please request another confirmation link or contact CricVerse support.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-lg bg-[#1f2833] hover:bg-[#1f2833]/80 text-white font-bold transition duration-200"
            >
              <span>Back to Sign In</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
