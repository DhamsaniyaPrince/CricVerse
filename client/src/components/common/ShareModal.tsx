'use client';

import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { 
  X, Copy, Check, Share2, 
  MessageSquare, Send
} from 'lucide-react';

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={{ width: '1em', height: '1em' }} {...props}>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={props.className} style={{ width: '1em', height: '1em' }} {...props}>
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
  </svg>
);

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  shareText: string;
  title?: string;
}

export default function ShareModal({ 
  isOpen, 
  onClose, 
  shareUrl, 
  shareText, 
  title = 'Share Accolades' 
}: ShareModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      setCanShare(true);
    }
  }, []);

  // Generate QR Code dynamically when modal opens
  useEffect(() => {
    if (isOpen && canvasRef.current && shareUrl) {
      QRCode.toCanvas(
        canvasRef.current, 
        shareUrl, 
        { 
          width: 180, 
          margin: 1.5,
          color: {
            dark: '#66fcf1',
            light: '#0b0c10'
          }
        }, 
        (error) => {
          if (error) console.error('Error generating QR code:', error);
        }
      );
    }
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: title,
        text: shareText,
        url: shareUrl,
      });
    } catch (err) {
      console.log('Error sharing:', err);
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);

  // Social Links
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
  const telegramUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
  const xUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-fadeIn">
      {/* Backdrop click closer */}
      <div className="absolute inset-0 cursor-default" onClick={onClose} />

      <div className="glass-card w-full max-w-md p-6 border-[#66fcf1]/20 bg-gradient-to-br from-[#1f2833]/90 via-[#0b0c10]/95 to-[#66fcf1]/5 relative z-10 space-y-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-lg font-black text-white uppercase tracking-wider flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-[#66fcf1]" />
            <span>{title}</span>
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code Section */}
        <div className="flex flex-col items-center justify-center p-4 bg-[#0b0c10]/80 rounded-2xl border border-[#66fcf1]/10">
          <canvas ref={canvasRef} className="rounded-xl border border-[#66fcf1]/30 shadow-lg shadow-[#66fcf1]/5" />
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-3.5">Scan to open public profile</p>
        </div>

        {/* Quick Link Input */}
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">Copy Profile URL</label>
          <div className="flex space-x-2">
            <input 
              type="text" 
              readOnly 
              value={shareUrl} 
              className="flex-1 px-3 py-2 text-xs bg-[#0b0c10]/60 border border-white/10 rounded-xl text-gray-300 font-mono focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className="px-4 py-2 bg-[#1f2833] border border-white/5 hover:border-[#66fcf1]/30 text-white rounded-xl hover:bg-[#1f2833]/80 transition flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px]"
            >
              {copied ? <Check className="w-4 h-4 text-[#66fcf1]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Social Share Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 p-3 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 hover:text-emerald-300 transition"
          >
            <MessageSquare className="w-4 h-4" />
            <span>WhatsApp</span>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 p-3 bg-sky-500/5 hover:bg-sky-500/10 border border-sky-500/10 hover:border-sky-500/30 rounded-xl text-xs font-bold text-sky-400 hover:text-sky-300 transition"
          >
            <Send className="w-4 h-4" />
            <span>Telegram</span>
          </a>

          {/* X / Twitter */}
          <a
            href={xUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition"
          >
            <XIcon className="w-4 h-4" />
            <span>X / Twitter</span>
          </a>

          {/* LinkedIn */}
          <a
            href={linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2.5 p-3 bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 hover:border-blue-500/30 rounded-xl text-xs font-bold text-blue-400 hover:text-blue-300 transition"
          >
            <LinkedinIcon className="w-4 h-4" />
            <span>LinkedIn</span>
          </a>
        </div>

        {/* Web Share Native (If available) */}
        {canShare && (
          <button
            onClick={handleNativeShare}
            className="w-full flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-[#66fcf1] to-cyan-500 hover:from-cyan-400 hover:to-cyan-600 rounded-xl text-xs font-bold text-[#0b0c10] shadow-lg shadow-[#66fcf1]/10 transition cursor-pointer min-h-[44px]"
          >
            <Share2 className="w-4 h-4" />
            <span>System Native Share</span>
          </button>
        )}
      </div>
    </div>
  );
}
