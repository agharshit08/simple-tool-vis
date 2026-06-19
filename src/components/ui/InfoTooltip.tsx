'use client';

import { useState } from 'react';

interface Props {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export default function InfoTooltip({ content, position = 'top', className = '' }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  const getPositionStyles = () => {
    switch (position) {
      case 'top': return { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' };
      case 'bottom': return { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' };
      case 'left': return { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' };
      case 'right': return { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' };
    }
  };

  return (
    <div 
      className={`info-tooltip-container ${className}`}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsHovered(!isHovered)}
    >
      <div 
        aria-label="More information"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: 'var(--bg-hover)',
          color: 'var(--text-secondary)',
          fontSize: '10px',
          fontFamily: 'var(--font-mono)',
          cursor: 'help',
          border: '1px solid var(--border)',
        }}
      >
        i
      </div>
      
      {isHovered && (
        <div 
          className="tooltip-content animate-in"
          style={{
            position: 'absolute',
            ...getPositionStyles(),
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            color: 'var(--text-secondary)',
            fontSize: '0.75rem',
            width: 'max-content',
            maxWidth: '250px',
            zIndex: 99999, // Super high z-index
            lineHeight: 1.5,
            pointerEvents: 'none'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
