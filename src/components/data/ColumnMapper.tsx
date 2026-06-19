'use client';

import type { ParsedDataset, ColumnType } from '@/lib/csvParser';
import { useDataset } from '@/context/DatasetContext';
import { Eye, EyeOff, Columns, Bot } from 'lucide-react';

const ALL_TYPES: ColumnType[] = ['date', 'year', 'location', 'latitude', 'longitude', 'entity', 'number', 'boolean', 'category', 'text', 'relationship'];

export default function ColumnMapper() {
  const { dataset, setDataset, isAnalyzingColumns, hiddenColumns, setHiddenColumns } = useDataset();

  if (!dataset) return null;

  const updateColumnType = (colName: string, newType: ColumnType) => {
    setDataset({
      ...dataset,
      columns: dataset.columns.map(c => c.name === colName ? { ...c, type: newType } : c),
    });
  };

  const toggleColumnVisibility = (colName: string) => {
    if (hiddenColumns.includes(colName)) {
      setHiddenColumns(hiddenColumns.filter(c => c !== colName));
    } else {
      setHiddenColumns([...hiddenColumns, colName]);
    }
  };

  const categories = [
    { title: 'Location Data', types: ['location', 'latitude', 'longitude'] },
    { title: 'Temporal Data', types: ['date', 'year'] },
    { title: 'Numeric Data', types: ['number'] },
    { title: 'Text & Entities', types: ['text', 'entity', 'category', 'boolean', 'relationship'] }
  ];

  return (
    <div className="column-mapper panel-section">
      <div className="section-title" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Columns size={20} color="var(--text-primary)" />
        <h3 style={{ margin: 0 }}>Column Data Types</h3>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
        Review and adjust detected column types to ensure correct visualizations.
      </p>
      
      {isAnalyzingColumns ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
          <div style={{ padding: '0.75rem', background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Bot size={16} color="var(--gold)" />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>AI is classifying columns...</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>Detecting structures to build smart visualizations.</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div className="animate-shimmer" style={{ height: '14px', width: '40%', borderRadius: '4px' }} />
              <div className="animate-shimmer" style={{ height: '32px', width: '100%', borderRadius: '4px' }} />
              <div className="animate-shimmer" style={{ height: '32px', width: '100%', borderRadius: '4px' }} />
            </div>
          ))}
          </div>
        </div>
      ) : (
        categories.map(cat => {
          const cols = dataset.columns.filter(c => cat.types.includes(c.type));
          if (cols.length === 0) return null;

          return (
            <div key={cat.title} className="column-category">
              <h4 className="column-category-title">{cat.title}</h4>
              <div className="column-category-list">
                {cols.map(col => {
                  const isHidden = hiddenColumns.includes(col.name);
                  return (
                    <div key={col.name} className="column-row" id={`col-${col.name}`} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="column-name" style={{ flex: 1, opacity: isHidden ? 0.5 : 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={col.name}>{col.name}</span>
                      <select
                        className="column-type-select select"
                        value={col.type}
                        onChange={e => updateColumnType(col.name, e.target.value as ColumnType)}
                        aria-label={`Column type for ${col.name}`}
                        style={{ width: '100px', flexShrink: 0 }}
                      >
                        {ALL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <button
                        onClick={() => toggleColumnVisibility(col.name)}
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '0.25rem', color: isHidden ? 'var(--text-muted)' : 'var(--text-primary)', flexShrink: 0 }}
                        title={isHidden ? "Show column in table" : "Hide column in table"}
                        aria-label={isHidden ? `Show ${col.name}` : `Hide ${col.name}`}
                      >
                        {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
