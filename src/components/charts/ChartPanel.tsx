'use client';

import { useState, useMemo, useEffect } from 'react';
import { useDataset } from '@/context/DatasetContext';
import { Sparkles } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import { Bar, Line, Scatter } from 'react-chartjs-2';
import type { ParsedDataset } from '@/lib/csvParser';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const CHART_TYPES = ['Bar', 'Line', 'Scatter'] as const;
type ChartType = typeof CHART_TYPES[number];

const PRIMARY = '#111111';
const SECONDARY = '#555555';
const TERTIARY = '#888888';
const QUATERNARY = '#aaaaaa';
const PALETTE = [PRIMARY, SECONDARY, TERTIARY, QUATERNARY, '#cccccc', '#eeeeee'];

const CHART_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { color: '#555555', font: { family: 'var(--font-sans)' } } },
    tooltip: {
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e2e2e2',
      borderWidth: 1,
      titleColor: '#111111',
      bodyColor: '#555555',
      bodyFont: { family: 'var(--font-sans)' },
      titleFont: { family: 'var(--font-sans)', weight: 'bold' }
    },
  },
  scales: {
    x: {
      ticks: { color: '#888888', font: { family: 'var(--font-sans)', size: 11 }, maxRotation: 45, minRotation: 0 },
      grid: { color: 'rgba(0,0,0,0.03)' },
    },
    y: {
      ticks: { color: '#888888', font: { family: 'var(--font-sans)', size: 11 } },
      grid: { color: 'rgba(0,0,0,0.03)' },
      beginAtZero: true
    },
  },
};

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

export default function ChartPanel({ dataset, filteredRows }: Props) {
  const { suggestedInsights, isAnalyzingColumns } = useDataset();
  const [chartType, setChartType] = useState<ChartType>('Bar');
  const [aggregation, setAggregation] = useState<'average' | 'sum' | 'count'>('average');
  const [xCol, setXCol] = useState<string>('');
  const [yCol, setYCol] = useState<string>('');

  const numericCols = dataset.columns.filter(c => c.type === 'number');
  const groupCols = dataset.columns.filter(c => ['category', 'location', 'entity', 'text', 'year', 'date', 'boolean'].includes(c.type));

  const validXCols = chartType === 'Scatter' ? numericCols : groupCols;
  const validYCols = chartType === 'Scatter' ? numericCols : (aggregation === 'count' ? dataset.columns : numericCols);

  const validXColNames = validXCols.map(c => c.name).join(',');
  const validYColNames = validYCols.map(c => c.name).join(',');

  // Auto-select valid columns on mount or when switching chart types
  useEffect(() => {
    // If there are no numeric columns, average and sum are invalid. Force count.
    if (numericCols.length === 0 && aggregation !== 'count' && chartType !== 'Scatter') {
      setAggregation('count');
      return; // Will re-run after state update
    }

    if (validXCols.length > 0) {
      setXCol(prev => validXCols.find(c => c.name === prev) ? prev : validXCols[0].name);
    }
    if (validYCols.length > 0) {
      setYCol(prev => validYCols.find(c => c.name === prev) ? prev : validYCols[0].name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartType, aggregation, validXColNames, validYColNames, numericCols.length]);

  const chartData = useMemo(() => {
    if (!xCol || !yCol) return null;

    if (chartType === 'Scatter') {
      const points = filteredRows
        .map(r => ({ x: parseFloat(r[xCol]), y: parseFloat(r[yCol]) }))
        .filter(p => !isNaN(p.x) && !isNaN(p.y));
      return {
        datasets: [{
          label: `${xCol} vs ${yCol}`,
          data: points,
          backgroundColor: PRIMARY + '80',
          pointRadius: 5,
          pointHoverRadius: 8,
        }],
      };
    }

    // Aggregate by xCol
    const aggMap = new Map<string, number[]>();
    filteredRows.forEach(r => {
      const key = r[xCol] || '(empty)';
      const val = parseFloat(r[yCol]);
      if (aggregation === 'count') {
        if (!aggMap.has(key)) aggMap.set(key, []);
        aggMap.get(key)!.push(1); // just push 1 to count occurrences
      } else if (!isNaN(val)) {
        if (!aggMap.has(key)) aggMap.set(key, []);
        aggMap.get(key)!.push(val);
      }
    });

    const sorted = [...aggMap.entries()]
      .sort((a, b) => {
        const numA = Number(a[0]); const numB = Number(b[0]);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a[0].localeCompare(b[0]);
      })
      .slice(0, 30);

    const labels = sorted.map(([k]) => k);
    let values: number[];
    if (aggregation === 'count') {
      values = sorted.map(([, vs]) => vs.length);
    } else if (aggregation === 'sum') {
      values = sorted.map(([, vs]) => vs.reduce((a, b) => a + b, 0));
    } else {
      values = sorted.map(([, vs]) => vs.reduce((a, b) => a + b, 0) / vs.length);
    }

    return {
      labels,
      datasets: [{
        label: aggregation === 'count' ? `Count of records` : `${aggregation} of ${yCol}`,
        data: values,
        backgroundColor: chartType === 'Bar'
          ? labels.map((_, i) => PALETTE[i % PALETTE.length] + 'b0')
          : PRIMARY + '80',
        borderColor: chartType === 'Line' ? PRIMARY : undefined,
        borderWidth: chartType === 'Line' ? 2 : 0,
        pointBackgroundColor: PRIMARY,
        tension: 0.4,
        fill: chartType === 'Line',
        borderRadius: chartType === 'Bar' ? 6 : 0,
      }],
    };
  }, [filteredRows, xCol, yCol, chartType, aggregation]);

  const ChartComponent = { Bar, Line, Scatter }[chartType] as typeof Bar;

  if (isAnalyzingColumns) {
    return (
      <div className="chart-card" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
          background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(4px)',
          borderRadius: 'var(--radius-xl)'
        }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--gold)', borderTopColor: 'transparent', marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>Analyzing Variables...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Categorizing data types to build charts</p>
        </div>
        <div className="chart-card-header">
          <div className="animate-shimmer" style={{ height: '24px', width: '120px', borderRadius: '4px' }} />
          <div className="animate-shimmer" style={{ height: '32px', width: '180px', borderRadius: '6px' }} />
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="animate-shimmer" style={{ height: '36px', width: '220px', borderRadius: '6px' }} />
          <div className="animate-shimmer" style={{ height: '36px', width: '220px', borderRadius: '6px' }} />
          <div className="animate-shimmer" style={{ height: '36px', width: '160px', borderRadius: '6px', marginLeft: 'auto' }} />
        </div>

        <div className="chart-container" style={{ minHeight: '300px' }}>
          <div style={{ height: '100%', width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', padding: '1rem' }}>
            {[...Array(15)].map((_, i) => {
              const heights = [30, 60, 45, 80, 50, 75, 90, 40, 65, 85, 55, 70, 35, 95, 60];
              return (
                <div key={i} className="animate-shimmer" style={{ flex: 1, height: `${heights[i]}%`, borderRadius: '4px 4px 0 0', opacity: 0.5 }} />
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <div className="animate-shimmer" style={{ height: '24px', width: '180px', borderRadius: '4px', marginBottom: '1rem' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="insight-card" style={{ padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div className="animate-shimmer" style={{ height: '16px', width: '70%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '12px', width: '100%', borderRadius: '4px', marginTop: '4px' }} />
                <div className="animate-shimmer" style={{ height: '12px', width: '80%', borderRadius: '4px' }} />
                <div className="animate-shimmer" style={{ height: '12px', width: '40%', borderRadius: '4px', marginTop: 'auto' }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-card">
      <div className="chart-card-header">
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem' }}>Data Chart</h3>
        <div className="chart-tabs" role="tablist" aria-label="Chart type" style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-hover)', padding: '0.25rem', borderRadius: '8px' }}>
          {CHART_TYPES.map(t => (
            <button
              key={t}
              className={`chart-tab ${chartType === t ? 'active' : ''}`}
              onClick={() => setChartType(t)}
              role="tab"
              aria-selected={chartType === t}
              id={`chart-tab-${t.toLowerCase()}`}
              style={{
                border: 'none',
                background: chartType === t ? 'var(--bg-card)' : 'transparent',
                boxShadow: chartType === t ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '0.25rem 0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                fontWeight: chartType === t ? 600 : 500,
                color: chartType === t ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Column selectors */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>X Axis</label>
          <select className="input select" style={{ padding: '0.375rem 32px 0.375rem 0.75rem', fontSize: '0.8125rem', height: 'auto', width: '180px' }} value={xCol} onChange={e => setXCol(e.target.value)} aria-label="X axis column" id="chart-x-select">
            {validXCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Y Axis</label>
          <select className="input select" style={{ padding: '0.375rem 32px 0.375rem 0.75rem', fontSize: '0.8125rem', height: 'auto', width: '180px' }} value={yCol} onChange={e => setYCol(e.target.value)} aria-label="Y axis column" id="chart-y-select">
            {validYCols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
          </select>
        </div>
        
        {chartType !== 'Scatter' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Aggregation</label>
            <select className="input select" style={{ padding: '0.375rem 32px 0.375rem 0.75rem', fontSize: '0.8125rem', height: 'auto', width: '120px' }} value={aggregation} onChange={e => setAggregation(e.target.value as any)}>
              {numericCols.length > 0 && <option value="average">Average</option>}
              {numericCols.length > 0 && <option value="sum">Sum</option>}
              <option value="count">Count</option>
            </select>
          </div>
        )}
      </div>

      <div className="chart-container" style={{ minHeight: '300px' }}>
        {chartData ? (
          <ChartComponent data={chartData as any} options={CHART_OPTIONS as any} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
            Select columns to render chart
          </div>
        )}
      </div>

      {suggestedInsights && suggestedInsights.length > 0 && (
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
          <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles size={20} /> Smart Insights
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            {suggestedInsights.map((insight, i) => (
              <button
                key={i}
                onClick={() => {
                  let t: ChartType = 'Bar';
                  const lower = (insight.chartType || '').toLowerCase();
                  if (lower.includes('line')) t = 'Line';
                  else if (lower.includes('scatter')) t = 'Scatter';
                  
                  setChartType(t);
                  setAggregation(insight.aggregation);
                  setTimeout(() => {
                    setXCol(insight.xCol);
                    setYCol(insight.yCol);
                  }, 0);
                }}
                className="insight-card"
                style={{
                  textAlign: 'left',
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', lineHeight: '1.4' }}>{insight.title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>{insight.description}</div>
                <div style={{ marginTop: 'auto', paddingTop: '0.5rem', fontSize: '0.7rem', fontWeight: 600, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Apply
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

