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
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    // Frequency sweep for a "pop" sound
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1);
    
    // Increased volume from 0.1 to 0.4 so it's more audible
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
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
    
    // Auto remove after 8 seconds (increased from 5s)
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 8000);
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
            background: '#1e293b', // Darker background for higher contrast
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '280px',
            maxWidth: '400px',
            pointerEvents: 'auto',
            animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
            color: '#ffffff' // White text for visibility
          }}>
            {n.type === 'success' ? (
              <CheckCircle2 size={18} style={{ color: '#4ade80', flexShrink: 0 }} /> // bright green
            ) : (
              <Info size={18} style={{ color: '#60a5fa', flexShrink: 0 }} /> // bright blue
            )}
            
            <span style={{ fontSize: '0.875rem', fontWeight: 500, flex: 1, fontFamily: 'var(--font-sans)', color: '#ffffff' }}>
              {n.message}
            </span>
            
            {n.action && (
              <button
                onClick={() => { n.action!.onClick(); dismiss(n.id); }}
                style={{
                  background: 'none',
                  color: '#93c5fd', // Light blue action text
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
                color: '#94a3b8', padding: '2px', display: 'flex'
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
