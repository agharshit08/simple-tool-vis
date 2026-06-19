'use client';

import { useState, useEffect } from 'react';
import type { ParsedDataset } from '@/lib/csvParser';
import { useDataset } from '@/context/DatasetContext';
import { MoreVertical, Trash2 } from 'lucide-react';

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

export default function DataTable({ dataset, filteredRows }: Props) {
  const { hiddenColumns, deleteRow } = useDataset();
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.row-action-btn') && !target.closest('.row-action-menu')) {
        setMenuOpenIndex(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const visibleColumns = dataset.columns.filter(col => !hiddenColumns.includes(col.name));

  return (
    <div className="data-table-container">
      <div className="data-table-wrapper" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
        <table className="data-table" aria-label="Complete data view">
          <thead>
            <tr>
              <th scope="col" style={{ width: '40px', textAlign: 'center', position: 'sticky', left: 0, zIndex: 11, background: 'var(--bg-surface)', borderRight: '2px solid var(--border)', padding: '0.5rem' }}>
                <span style={{ opacity: 0 }}>...</span>
              </th>
              {visibleColumns.map(col => (
                <th key={col.name} scope="col">{col.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRows.slice(0, 100).map((row, i) => {
              const isActive = menuOpenIndex === i;
              return (
              <tr 
                key={i}
                style={{
                  backgroundColor: isActive ? 'var(--bg-active)' : undefined
                }}
              >
                <td 
                  style={{ 
                    textAlign: 'center', 
                    position: 'sticky', 
                    left: 0, 
                    zIndex: isActive ? 50 : 10, 
                    background: isActive ? 'var(--bg-active)' : 'var(--bg-surface)', 
                    borderRight: '2px solid var(--border)', 
                    overflow: 'visible',
                    transition: 'background-color 0.2s'
                  }}
                >
                  <div style={{ position: 'relative' }}>
                    <button 
                      className="row-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenIndex(isActive ? null : i);
                      }}
                      style={{ 
                        background: isActive ? 'var(--bg-hover)' : 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                        borderRadius: '4px',
                        outline: 'none'
                      }}
                      title="Row actions"
                      aria-label="Row actions"
                    >
                      <MoreVertical size={16} />
                    </button>
                    {isActive && (
                      <div 
                        className="row-action-menu"
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '40px',
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          zIndex: 100,
                          minWidth: '120px',
                          padding: '4px'
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteRow(row);
                            setMenuOpenIndex(null);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            width: '100%',
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                            borderRadius: '4px',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                {visibleColumns.map(col => (
                  <td 
                    key={col.name} 
                    title={row[col.name]}
                    style={{
                      backgroundColor: isActive ? 'var(--bg-active)' : undefined,
                      transition: 'background-color 0.2s'
                    }}
                  >
                    {row[col.name] || '—'}
                  </td>
                ))}
              </tr>
              );
            })}
          </tbody>
        </table>
        {filteredRows.length > 100 && (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Displaying first 100 rows for performance.
          </div>
        )}
      </div>
    </div>
  );
}
