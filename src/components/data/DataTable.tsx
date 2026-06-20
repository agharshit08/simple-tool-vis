'use client';

import { useState, useEffect, useMemo } from 'react';
import type { ParsedDataset } from '@/lib/csvParser';
import { useDataset } from '@/context/DatasetContext';
import { MoreVertical, Trash2, ArrowUpDown, Search } from 'lucide-react';

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

export default function DataTable({ dataset, filteredRows }: Props) {
  const { hiddenColumns, deleteRow } = useDataset();
  const [menuOpenIndex, setMenuOpenIndex] = useState<number | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [globalFilter, setGlobalFilter] = useState('');

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

  const sortedAndFilteredRows = useMemo(() => {
    let result = filteredRows;

    if (globalFilter.trim() !== '') {
      const lowerFilter = globalFilter.toLowerCase();
      result = result.filter(row => 
        visibleColumns.some(col => String(row[col.name] || '').toLowerCase().includes(lowerFilter))
      );
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        
        const numA = Number(valA);
        const numB = Number(valB);
        if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
          return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
        }

        return sortConfig.direction === 'asc' 
          ? String(valA).localeCompare(String(valB))
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [filteredRows, visibleColumns, sortConfig, globalFilter]);

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      if (prev?.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        return null; // toggle off
      }
      return { key, direction: 'asc' };
    });
  };

  return (
    <div className="data-table-container">
      <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <div style={{ position: 'relative', width: '250px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search all columns..." 
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{ width: '100%', padding: '0.4rem 0.5rem 0.4rem 28px', fontSize: '0.8125rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-deep)', color: 'var(--text-primary)', outline: 'none' }}
          />
        </div>
      </div>
      <div className="data-table-wrapper" style={{ maxHeight: 'calc(100vh - 250px)', overflowY: 'auto' }}>
        <table className="data-table" aria-label="Complete data view">
          <thead>
            <tr>
              <th scope="col" style={{ width: '40px', textAlign: 'center', position: 'sticky', left: 0, zIndex: 11, background: 'var(--bg-surface)', borderRight: '2px solid var(--border)', padding: '0.5rem' }}>
                <span style={{ opacity: 0 }}>...</span>
              </th>
              {visibleColumns.map(col => (
                <th 
                  key={col.name} 
                  scope="col"
                  onClick={() => handleSort(col.name)}
                  style={{ cursor: 'pointer', userSelect: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-surface)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    {col.name}
                    <ArrowUpDown size={12} style={{ 
                      opacity: sortConfig?.key === col.name ? 1 : 0.2,
                      color: sortConfig?.key === col.name ? 'var(--gold)' : 'inherit'
                    }} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredRows.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                  No rows match your search.
                </td>
              </tr>
            ) : (
              sortedAndFilteredRows.map((row, i) => {
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
            }))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
