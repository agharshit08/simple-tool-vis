'use client';

import { useState, useRef, useEffect } from 'react';
import type { ParsedDataset } from '@/lib/csvParser';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { useDataset } from '@/context/DatasetContext';

interface Props {
  dataset: ParsedDataset;
  selectedCol: string | null;
  setSelectedCol: (col: string) => void;
  minYear: number;
  maxYear: number;
  startYear: number;
  endYear: number;
  setStartYear: (y: number) => void;
  setEndYear: (y: number) => void;
  playing: boolean;
  setPlaying: (p: boolean | ((p: boolean) => boolean)) => void;
  visibleCount: number;
}

export default function TimelineSlider({
  dataset, selectedCol, setSelectedCol,
  minYear, maxYear, startYear, endYear, setStartYear, setEndYear,
  playing, setPlaying, visibleCount
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);

  const timeCols = dataset.columns.filter(c => c.type === 'year' || c.type === 'date');

  const rangeSpan = Math.max(1, maxYear - minYear);
  const leftPercent = ((startYear - minYear) / rangeSpan) * 100;
  const rightPercent = ((endYear - minYear) / rangeSpan) * 100;
  const widthPercent = rightPercent - leftPercent;

  // Handle drag
  useEffect(() => {
    if (!dragging) return;
    
    const handleMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percent = x / rect.width;
      const val = Math.round(minYear + percent * rangeSpan);

      if (dragging === 'start') {
        if (val < endYear) setStartYear(val);
      } else if (dragging === 'end') {
        if (val > startYear) setEndYear(val);
      }
    };
    
    const handleUp = () => setDragging(null);

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, minYear, maxYear, rangeSpan, startYear, endYear, setStartYear, setEndYear]);

  const { isAnalyzingColumns } = useDataset();

  return (
    <div style={{ marginBottom: '1rem' }}>
      {isAnalyzingColumns ? (
        <div className="animate-shimmer shimmer-block" style={{ height: '60px', width: '100%', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }} />
      ) : (
      <div className="animate-in" style={{ 
        padding: '0.625rem 1rem', 
        background: 'var(--bg-card)', 
        borderRadius: 'var(--radius-lg)', 
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        gap: '1.25rem'
      }}>
        
        {/* Left Side: Title & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem', minWidth: '130px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Timeline</h3>
            <InfoTooltip 
              content="Drag the slider handles to focus on a specific era. Dashboard updates instantly."
              position="right"
            />
          </div>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Filter temporal trends
          </p>
        </div>

        {/* Center: Custom Dual Slider */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 10px' }}>
          
          <div style={{ position: 'relative', height: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {/* Min/Max Labels at the very edges */}
            <div style={{ position: 'absolute', top: '-6px', width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>{minYear}</span>
              <span>{maxYear}</span>
            </div>

            <div 
              ref={containerRef}
              style={{ position: 'relative', height: '24px', width: '100%', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const percent = (e.clientX - rect.left) / rect.width;
                const clickVal = minYear + percent * rangeSpan;
                if (Math.abs(clickVal - startYear) < Math.abs(clickVal - endYear)) {
                  setDragging('start');
                  setStartYear(Math.round(clickVal));
                } else {
                  setDragging('end');
                  setEndYear(Math.round(clickVal));
                }
              }}
            >
              {/* Background Track */}
              <div style={{ position: 'absolute', width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px' }} />
              
              {/* Active Range Fill */}
              <div style={{ position: 'absolute', left: `${leftPercent}%`, width: `${widthPercent}%`, height: '6px', background: 'var(--gold)', borderRadius: '3px' }} />
              
              {/* Start Thumb */}
              <div 
                style={{ 
                  position: 'absolute', left: `${leftPercent}%`, width: '16px', height: '16px', 
                  background: 'var(--bg-card)', border: '2px solid var(--gold)', borderRadius: '50%',
                  transform: 'translate(-50%, 0)', cursor: 'grab', zIndex: dragging === 'start' ? 10 : 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onPointerDown={(e) => { e.stopPropagation(); setDragging('start'); }}
              />

              {/* End Thumb */}
              <div 
                style={{ 
                  position: 'absolute', left: `${rightPercent}%`, width: '16px', height: '16px', 
                  background: 'var(--bg-card)', border: '2px solid var(--gold)', borderRadius: '50%',
                  transform: 'translate(-50%, 0)', cursor: 'grab', zIndex: dragging === 'end' ? 10 : 2,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onPointerDown={(e) => { e.stopPropagation(); setDragging('end'); }}
              />
            </div>
            
            {/* Floating Value Labels Below Thumbs */}
            <div style={{ 
              position: 'absolute', left: `${leftPercent}%`, bottom: '-4px', 
              transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 600, 
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' 
            }}>
              {startYear}
            </div>
            <div style={{ 
              position: 'absolute', left: `${rightPercent}%`, bottom: '-4px', 
              transform: 'translateX(-50%)', fontSize: '0.7rem', fontWeight: 600, 
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', pointerEvents: 'none' 
            }}>
              {endYear}
            </div>
          </div>
        </div>

        {/* Right Controls (Time Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0, paddingLeft: '1.25rem', borderLeft: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Time Col
            </label>
            <select 
              className="input select" 
              style={{ fontSize: '0.75rem', padding: '2px 24px 2px 6px', width: '100px', border: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer', height: '24px' }}
              value={selectedCol || ''}
              onChange={e => setSelectedCol(e.target.value)}
            >
              {timeCols.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'right' }}>
            {visibleCount} / {dataset.rowCount} rows
          </div>
        </div>

      </div>
      )}
    </div>
  );
}
