'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, Info, X, ArrowRight } from 'lucide-react';

export interface NotificationAction {
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  message: string;
  type?: 'info' | 'success';
  action?: NotificationAction;
}

interface NotificationContextType {
  notify: (message: string, options?: { type?: 'info' | 'success', action?: NotificationAction }) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  notify: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

// Helper to play a subtle "pop" sound using Web Audio API
function playPopSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    // Frequency sweep for a "pop" sound
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error('Audio play failed', e);
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string, options?: { type?: 'info' | 'success', action?: NotificationAction }) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type: options?.type || 'info', action: options?.action }]);
    playPopSound();
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const dismiss = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        pointerEvents: 'none', // Allow clicking through the container
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            background: 'var(--bg-card)',
            border: `1px solid var(--border)`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '400px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: 'var(--text-primary)'
          }}>
            {n.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: 'var(--success)', flexShrink: 0 }} />
            ) : (
              <Info size={18} style={{ color: 'var(--gold)', flexShrink: 0 }} />
            )}
            
            <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1, fontFamily: 'var(--font-sans)' }}>
              {n.message}
            </span>
            
            {n.action && (
              <button
                onClick={() => { n.action!.onClick(); dismiss(n.id); }}
                style={{
                  background: 'none',
                  color: 'var(--text-primary)',
                  border: 'none',
                  padding: '4px 8px',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontFamily: 'var(--font-sans)',
                  textDecoration: 'underline',
                  textUnderlineOffset: '2px'
                }}
              >
                {n.action.label} <ArrowRight size={14} />
              </button>
            )}

            <button
              onClick={() => dismiss(n.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '2px', display: 'flex'
              }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </NotificationContext.Provider>
  );
}
