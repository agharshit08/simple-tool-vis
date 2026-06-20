'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { LogIn, LogOut, Infinity } from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, signInWithGoogle, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Link href="/" className="navbar-brand" aria-label="Aeterna Home">
        <Image src="/logo.png" alt="Aeterna Logo" width={28} height={28} className="logo-icon" style={{ borderRadius: '4px' }} />
        <span className="logo-text">Aeterna</span>
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {user && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: 'var(--radius-md)', transition: 'background 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  referrerPolicy="no-referrer"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {user.displayName?.charAt(0) || 'U'}
                </div>
              )}
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                {user.displayName}
              </span>
            </button>
            
            {showDropdown && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)', padding: '0.25rem',
                boxShadow: 'var(--shadow-md)', minWidth: '150px',
                zIndex: 1000
              }}>
                <button 
                  onClick={() => { setShowDropdown(false); logout(); }} 
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.5rem 0.75rem', background: 'transparent',
                    border: 'none', cursor: 'pointer', borderRadius: '4px',
                    color: 'var(--error)', fontSize: '0.875rem', fontWeight: 500
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <LogOut size={16} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
