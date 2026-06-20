'use client';

import { useState, useRef, useCallback } from 'react';
import { parseFileBasic, detectColumnsAI, generateInsightsHeuristics, getSheetNames } from '@/lib/csvParser';
import { useDataset } from '@/context/DatasetContext';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileSpreadsheet, FileText, Loader2, AlertCircle, BarChart3, Map as MapIcon, Clock, Network, Bot, ArrowRight } from 'lucide-react';

const getFeatureIcon = (type: string) => {
  switch (type) {
    case 'charts': return <BarChart3 size={14} />;
    case 'map': return <MapIcon size={14} />;
    case 'timeline': return <Clock size={14} />;
    case 'network': return <Network size={14} />;
    case 'ai': return <Bot size={14} />;
    default: return null;
  }
};

const SAMPLE_DATASETS = [
  {
    name: 'European Trade Routes 1578–1680',
    description: '100 voyages · merchants, origin/destination cities, cargo & values',
    tag: 'Commerce',
    file: '/sample-datasets/trade_routes_1578_1680.csv',
    filename: 'trade_routes_1578_1680.csv',
    features: [{ label: 'Charts', icon: 'charts' }, { label: 'Geo Map', icon: 'map' }, { label: 'Timeline', icon: 'timeline' }],
  },
  {
    name: 'Renaissance Scholars Network 1473–1804',
    description: '100 scholars · birth/death cities, disciplines, mentors',
    tag: 'Prosopography',
    file: '/sample-datasets/scholars_network_1473_1804.csv',
    filename: 'scholars_network_1473_1804.csv',
    features: [{ label: 'Network', icon: 'network' }, { label: 'Geo Map', icon: 'map' }, { label: 'Smart Insights', icon: 'ai' }],
  },
  {
    name: 'World Archaeological Sites',
    description: '100 sites with exact lat/lng · periods, artifact counts, UNESCO status',
    tag: 'Archaeology',
    file: '/sample-datasets/archaeological_sites_world.csv',
    filename: 'archaeological_sites_world.csv',
    features: [{ label: 'Geo Map', icon: 'map' }, { label: 'Charts', icon: 'charts' }, { label: 'Smart Insights', icon: 'ai' }],
  },
];

export default function UploadPage() {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [progress, setProgress] = useState(0);
  const { setDataset, setResearchContext, setAnalyzingColumns, setSuggestedInsights } = useDataset();
  const [error, setError] = useState<string | null>(null);
  const [researchContextText, setResearchContextText] = useState('');
  const [availableSheets, setAvailableSheets] = useState<string[]>([]);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const processFile = async (file: File, sheetName?: string) => {
    setLoading(true);
    setLoadingMsg(`Parsing ${file.name.endsWith('.xlsx') ? 'Excel' : 'CSV'}...`);
    setProgress(5);
    try {
      const result = await parseFileBasic(file, researchContextText, sheetName, (msg, pct) => {
        setLoadingMsg(msg);
        if (pct !== undefined) setProgress(pct);
      });
      setDataset(result);
      setResearchContext(researchContextText);
      setAvailableSheets([]);
      setPendingFile(null);
      
      setAnalyzingColumns(true);
      detectColumnsAI(result).then((enrichedDataset) => {
        setDataset(prev => prev ? { 
          ...prev, 
          columns: enrichedDataset.columns,
          insights: enrichedDataset.insights,
          networkRecommendations: enrichedDataset.networkRecommendations
        } : null);
        setAnalyzingColumns(false);
      }).catch(err => {
        console.error('Background AI failed:', err);
        setAnalyzingColumns(false);
      });

      router.push('/dashboard');
    } catch (e) {
      setError('Failed to parse file: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setLoading(false);
      setLoadingMsg('');
      setProgress(0);
    }
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      setError('Please upload a .csv or .xlsx file');
      return;
    }
    setError(null);
    
    if (file.name.endsWith('.xlsx')) {
      try {
        setLoading(true);
        setLoadingMsg('Reading Excel file...');
        const sheets = await getSheetNames(file);
        if (sheets.length > 1) {
          setAvailableSheets(sheets);
          setPendingFile(file);
          setLoading(false);
          setLoadingMsg('');
          return;
        }
      } catch (e) {
        setError('Failed to read Excel file: ' + (e instanceof Error ? e.message : 'Unknown error'));
        setLoading(false);
        return;
      }
    }
    
    processFile(file);
  }, [researchContextText]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSampleLoad = async (sample: typeof SAMPLE_DATASETS[0]) => {
    setError(null);
    setLoading(true);
    setLoadingMsg(`Loading ${sample.name}...`);
    setProgress(5);
    try {
      const res = await fetch(sample.file);
      if (!res.ok) throw new Error(`Could not fetch sample: ${res.statusText}`);
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/csv' });
      const file = new File([blob], sample.filename, { type: 'text/csv' });
      const result = await parseFileBasic(file, researchContextText, undefined, (msg, pct) => {
        setLoadingMsg(msg);
        if (pct !== undefined) setProgress(pct);
      });
      setDataset(result);
      
      setAnalyzingColumns(true);
      detectColumnsAI(result).then((enrichedDataset) => {
        setDataset(prev => prev ? { ...prev, columns: enrichedDataset.columns } : null);
      }).catch(err => {
        console.error('Background AI failed:', err);
      }).finally(() => {
        setAnalyzingColumns(false);
      });
      
      setResearchContext(researchContextText);
      router.push('/dashboard');
    } catch (e) {
      setError('Failed to load sample: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setLoading(false);
      setLoadingMsg('');
      setProgress(0);
    }
  };

  return (
    <div className="upload-page" style={{ margin: '0 auto', maxWidth: '800px', width: '100%', padding: '2rem', paddingTop: '6rem' }}>
      <div className="section-title animate-in" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center' }}>
          <UploadCloud size={28} />
        </div>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-sans)', color: 'var(--text-primary)', margin: 0 }}>Upload Your Dataset</h2>
      </div>

      <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9375rem' }} className="animate-in-delay-1">
        Upload a CSV or Excel file containing your data. Aeterna will automatically detect column types
        and prepare your data for visualisation across maps, charts, and network graphs.
      </p>

      {availableSheets.length === 0 && (
        <div className="animate-in-delay-1" style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 500 }}>
            Research Context (Optional)
          </label>
          <textarea
            className="input"
            style={{ width: '100%', minHeight: '80px', padding: '0.75rem', fontSize: '0.875rem', resize: 'vertical' }}
            placeholder="Paste your research abstract, goals, or context here. This helps the tool provide more relevant insights..."
            value={researchContextText}
            onChange={e => setResearchContextText(e.target.value)}
          />
        </div>
      )}

      {/* Sheet Selector */}
      {!loading && availableSheets.length > 0 && pendingFile && (
        <div className="card animate-in" style={{ marginBottom: '2rem', borderColor: 'var(--gold)' }}>
          <div className="section-title">
            <span className="icon">📄</span>
            <h3>Select a Sheet</h3>
            <span className="badge badge-gold" style={{ marginLeft: 'auto' }}>Multiple Sheets Detected</span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            The Excel file <strong>{pendingFile.name}</strong> contains multiple sheets. Please select which one you want to analyze.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
            {availableSheets.map(sheet => (
              <button
                key={sheet}
                className="btn btn-ghost"
                style={{ border: '1px solid var(--border)' }}
                onClick={() => processFile(pendingFile, sheet)}
              >
                📊 {sheet}
              </button>
            ))}
          </div>
          <div style={{ marginTop: '2rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setAvailableSheets([]); setPendingFile(null); }}>
              ↩ Cancel
            </button>
          </div>
        </div>
      )}

      {/* Drop Zone */}
      {availableSheets.length === 0 && (
        <div
          className={`dropzone animate-in-delay-1 ${dragging ? 'dragging' : ''}`}
          style={{
            border: `2px dashed ${dragging ? 'var(--gold)' : 'var(--border)'}`,
            borderRadius: 'var(--radius-lg)',
            padding: '3rem 2rem',
            textAlign: 'center',
            background: dragging ? 'rgba(184, 153, 103, 0.05)' : 'var(--bg-card)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !loading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Drop CSV/XLSX file here or click to browse"
          onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
          id="csv-dropzone"
        >
          <input ref={inputRef} type="file" accept=".csv,.xlsx" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: 'none' }} />
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Loader2 size={40} className="spinner" style={{ color: 'var(--gold)' }} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--text-primary)' }}>{loadingMsg}</h3>
              <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto', background: 'var(--bg-main)', borderRadius: '999px', overflow: 'hidden', height: '8px', border: '1px solid var(--border)' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', transition: 'width 0.3s ease-out' }}></div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: '80px', height: '80px', borderRadius: '50%', 
                background: 'rgba(184, 153, 103, 0.1)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center', color: 'var(--gold)',
                animation: 'pulseGlow 2.5s infinite', marginBottom: '0.5rem'
              }}>
                <UploadCloud size={40} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Drop your CSV file here</h3>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>or click to browse — supports any historical spreadsheet</p>
              <div style={{ marginTop: '0.5rem' }}>
                <span className="badge badge-muted" style={{ marginRight: '0.5rem' }}>CSV / XLSX</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>up to 50MB</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: 'var(--crimson)', marginTop: '1rem' }} role="alert">
          <p style={{ color: 'var(--crimson-bright)' }}>⚠️ {error}</p>
        </div>
      )}

      {/* Sample Datasets */}
      {!loading && availableSheets.length === 0 && (
        <div style={{ marginTop: '2rem' }} className="animate-in-delay-2">
          <h4 style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 500 }}>
            Or try a sample dataset (100 rows each)
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {SAMPLE_DATASETS.map(ds => (
              <button
                key={ds.filename}
                style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)', transition: 'all var(--ease-normal)', display: 'block', width: '100%' }}
                onClick={() => handleSampleLoad(ds)}
                id={`sample-${ds.filename}`}
                aria-label={`Load sample dataset: ${ds.name}`}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--gold)', background: 'rgba(184, 153, 103, 0.1)', padding: '0.2rem 0.6rem', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ds.tag}</span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '1rem', fontFamily: 'var(--font-sans)' }}>{ds.name}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.75rem', margin: 0 }}>{ds.description}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                      {ds.features.map(f => (
                        <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 500 }}>
                          {getFeatureIcon(f.icon)}
                          <span>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-primary)', fontWeight: 500, fontSize: '0.875rem', padding: '0.5rem 0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--bg-main)' }}>
                    Load <ArrowRight size={16} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
