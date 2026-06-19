'use client';

import dynamic from 'next/dynamic';
import { useDataset } from '@/context/DatasetContext';
import Link from 'next/link';

const HistoricalMapView = dynamic(() => import('@/components/map/HistoricalMapView'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - 120px)', flexDirection: 'column', gap: '1rem' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
      <p style={{ color: 'var(--text-muted)' }}>Loading map engine...</p>
    </div>
  ),
});

export default function MapPage() {
  const { dataset } = useDataset();

  if (!dataset) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🗺️</div>
        <h2 style={{ fontFamily: 'var(--font-serif)', marginBottom: '1rem' }}>No Dataset Loaded</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Upload a CSV file with location or coordinate columns to explore on the map.</p>
        <Link href="/upload" className="btn btn-primary btn-lg">Upload Dataset →</Link>
      </div>
    );
  }

  return <HistoricalMapView dataset={dataset} filteredRows={dataset.rows} />;
}
