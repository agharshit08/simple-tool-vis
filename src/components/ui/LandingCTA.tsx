'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { UploadCloud, LayoutDashboard } from 'lucide-react';

const GoogleLogo = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.16v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.16C1.43 8.55 1 10.22 1 12s.43 3.45 1.16 4.93l3.68-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.16 7.07l3.68 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function LandingCTA() {
  const { user, signInWithGoogle } = useAuth();

  if (user) {
    return (
      <div className="hero-cta animate-in-delay-3">
        <Link href="/upload" className="btn btn-primary btn-lg" id="cta-upload">
          <UploadCloud size={20} />
          Upload Your Dataset
        </Link>
        <Link href="/dashboard" className="btn btn-ghost btn-lg" id="cta-demo">
          <LayoutDashboard size={20} />
          View Demo Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="hero-cta animate-in-delay-3">
      <button 
        onClick={signInWithGoogle} 
        className="btn btn-lg pulse-glow" 
        style={{ 
          background: 'white', 
          color: '#3c4043', 
          border: '1px solid #dadce0',
          boxShadow: '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <GoogleLogo />
        Sign in with Google
      </button>
    </div>
  );
}
