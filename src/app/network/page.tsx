'use client';

import dynamic from 'next/dynamic';
import { useDataset } from '@/context/DatasetContext';
import Link from 'next/link';

const NetworkGraph = dynamic(() => import('@/components/charts/NetworkGraph'), { ssr: false });

export default function NetworkPage() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🕸️</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>No Dataset Loaded</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Upload a CSV file with entity columns to explore as a network.</p>
        <Link href="/upload" className="btn btn-primary btn-lg">Upload Dataset →</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title animate-in" style={{ marginBottom: '1.5rem' }}>
        <span className="icon">🕸️</span>
        <h2>Network Graph</h2>
        <span className="badge badge-gold" style={{ marginLeft: '0.5rem' }}>{dataset.filename}</span>
        <div style={{ marginLeft: 'auto' }}>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">← Dashboard</Link>
        </div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
        Force-directed graph connecting entities found in your dataset. Drag nodes to rearrange · Scroll to zoom.
      </p>
      <NetworkGraph dataset={dataset} filteredRows={dataset.rows} />
    </div>
  );
}
