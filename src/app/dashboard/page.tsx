'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useDataset } from '@/context/DatasetContext';
import dynamic from 'next/dynamic';
import DataTable from '@/components/data/DataTable';
import ColumnMapper from '@/components/data/ColumnMapper';
import TimelineSlider from '@/components/data/TimelineSlider';
import AIInsightsPanel from '@/components/ai/InsightsPanel';
import Link from 'next/link';
import InfoTooltip from '@/components/ui/InfoTooltip';
import { Compass, TableProperties, BarChart3, Map as MapIcon, Network, ChevronLeft, ChevronRight, Database, Columns, Bot, MessageSquare, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ChartPanel = dynamic(() => import('@/components/charts/ChartPanel'), { ssr: false });
const NetworkGraph = dynamic(() => import('@/components/charts/NetworkGraph'), { ssr: false });
const HistoricalMapView = dynamic(() => import('@/components/map/HistoricalMapView'), { ssr: false });

type ViewMode = 'data' | 'charts' | 'map' | 'network';
type RightTool = 'columns' | 'ai';

export default function DashboardPage() {
  const { dataset, selectedYear, setSelectedYear, isAnalyzingColumns } = useDataset();
  const router = useRouter();
  const [activeView, setActiveView] = useState<ViewMode>('data');
  
  // Collapse states
  const [isLeftPaneExpanded, setIsLeftPaneExpanded] = useState(true);
  const [isRightPaneExpanded, setIsRightPaneExpanded] = useState(false);
  const [activeTool, setActiveTool] = useState<RightTool>('columns');

  // Time column selector
  const [selectedYearCol, setSelectedYearCol] = useState<string | null>(null);

  // Initialize selected year column
  useEffect(() => {
    if (dataset && !selectedYearCol) {
      const yearColDef = dataset.columns.find(c => c.type === 'year' || c.type === 'date');
      if (yearColDef) setSelectedYearCol(yearColDef.name);
    }
  }, [dataset, selectedYearCol]);

  // Detect year range based on selected column
  const { minYear, maxYear } = useMemo(() => {
    if (!dataset || !selectedYearCol) return { minYear: 1400, maxYear: 1900 };
    const years = dataset.rows
      .map(r => parseInt(r[selectedYearCol]))
      .filter(y => !isNaN(y) && y > 0);
    if (!years.length) return { minYear: 1400, maxYear: 1900 };
    return { minYear: Math.min(...years), maxYear: Math.max(...years) };
  }, [dataset, selectedYearCol]);

  const [startYear, setStartYear] = useState<number>(minYear);
  const [endYear, setEndYear] = useState<number>(maxYear);
  const [playing, setPlaying] = useState(false);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset range when dataset or column changes
  useEffect(() => {
    setStartYear(minYear);
    setEndYear(maxYear);
    setSelectedYear(null);
  }, [minYear, maxYear, setSelectedYear]);

  // Animate playback (slides the entire window forward)
  useEffect(() => {
    if (playing) {
      playRef.current = setInterval(() => {
        setStartYear(prevStart => {
          setEndYear(prevEnd => {
            const windowSize = prevEnd - prevStart;
            const nextEnd = prevEnd + 1;
            if (nextEnd > maxYear) {
              setPlaying(false);
              return prevEnd;
            }
            return nextEnd;
          });
          
          // Ensure start year moves with end year to maintain window size
          return prevStart + 1;
        });
      }, 150); // Slightly slower for sliding windows
    } else {
      if (playRef.current) clearInterval(playRef.current);
    }
    return () => { if (playRef.current) clearInterval(playRef.current); };
  }, [playing, maxYear]);

  // Filtered rows by year range
  const filteredRows = useMemo(() => {
    if (!dataset) return [];
    if (!selectedYearCol) return dataset.rows;
    return dataset.rows.filter(r => {
      const y = parseInt(r[selectedYearCol]);
      return isNaN(y) || (y >= startYear && y <= endYear);
    });
  }, [dataset, startYear, endYear, selectedYearCol]);

  // Stats
  const stats = useMemo(() => {
    const locCols = dataset?.columns.filter(c => c.type === 'location') ?? [];
    const uniqueLocations = new Set(filteredRows.flatMap(r => locCols.map(c => r[c.name]).filter(Boolean)));
    const entityCols = dataset?.columns.filter(c => c.type === 'entity') ?? [];
    const uniqueEntities = new Set(filteredRows.flatMap(r => entityCols.map(c => r[c.name]).filter(Boolean)));
    return {
      records: dataset?.rowCount || 0,
      locations: uniqueLocations.size,
      entities: uniqueEntities.size,
    };
  }, [filteredRows, dataset]);

  useEffect(() => {
    if (!dataset) {
      router.replace('/upload');
    }
  }, [dataset, router]);

  if (!dataset) {
    return null;
  }

  return (
    <div className="workspace-layout">
      {/* Left Sidebar Navigation */}
      <aside className={`workspace-sidebar-left ${isLeftPaneExpanded ? '' : 'collapsed'}`}>
        <button 
          className="sidebar-toggle-btn" 
          onClick={() => setIsLeftPaneExpanded(!isLeftPaneExpanded)}
          style={{ alignSelf: isLeftPaneExpanded ? 'flex-end' : 'center', marginBottom: '1rem', padding: '0.25rem' }}
          aria-label={isLeftPaneExpanded ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {isLeftPaneExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        <div style={{ marginBottom: '2rem', width: '100%' }}>
          {isLeftPaneExpanded && (
            <div style={{ paddingLeft: 'var(--space-4)', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
              <h3 style={{ margin: 0, fontSize: '0.8125rem', fontWeight: 500, fontFamily: 'var(--font-sans)' }}>
                Explore data
              </h3>
            </div>
          )}
          <nav style={{ width: '100%' }}>
            <button 
              className={`workspace-nav-btn ${activeView === 'data' ? 'active' : ''}`}
              onClick={() => setActiveView('data')}
              title="Complete Data"
            >
              <TableProperties size={20} />
              <span className="nav-label">Complete Data</span>
            </button>
            <button 
              className={`workspace-nav-btn ${activeView === 'charts' ? 'active' : ''}`}
              onClick={() => setActiveView('charts')}
              title="Charts & Dashboards"
            >
              <BarChart3 size={20} />
              <span className="nav-label">Charts & Dashboards</span>
            </button>
            <button 
              className={`workspace-nav-btn ${activeView === 'map' ? 'active' : ''}`}
              onClick={() => setActiveView('map')}
              title="Geo Map"
            >
              <MapIcon size={20} />
              <span className="nav-label">Geo Map</span>
            </button>
            <button 
              className={`workspace-nav-btn ${activeView === 'network' ? 'active' : ''}`}
              onClick={() => setActiveView('network')}
              title="Network Graph"
            >
              <Network size={20} />
              <span className="nav-label">Network Graph</span>
            </button>
          </nav>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '2rem', borderTop: '1px solid var(--border)', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isLeftPaneExpanded ? 'flex-start' : 'center', paddingLeft: isLeftPaneExpanded ? 'var(--space-4)' : '0', marginBottom: '1rem', color: 'var(--text-muted)' }}>
            <Database size={20} />
            {isLeftPaneExpanded && (
              <h3 style={{ margin: 0, marginLeft: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Dataset Details
              </h3>
            )}
          </div>
          {isLeftPaneExpanded && (
            <div style={{ padding: '0 var(--space-4)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', wordBreak: 'break-all' }}>
              {dataset.filename}
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {stats.records.toLocaleString()} rows • {dataset.columns.length} columns
            </div>
              <Link href="/upload" className="btn btn-ghost btn-sm" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                Upload New
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Center Workspace */}
      <main className="workspace-center">
        {/* Timeline Slider (now shown everywhere) */}
        {(selectedYearCol || isAnalyzingColumns) && (
          <TimelineSlider 
            dataset={dataset}
            selectedCol={selectedYearCol}
            setSelectedCol={setSelectedYearCol}
            minYear={minYear} maxYear={maxYear}
            startYear={startYear} endYear={endYear}
            setStartYear={setStartYear} setEndYear={setEndYear}
            playing={playing} setPlaying={setPlaying}
            visibleCount={filteredRows.length}
          />
        )}

        {/* Dynamic View Content */}
        {activeView === 'data' && (
          <div className="animate-in" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
              <InfoTooltip content="This table shows your raw data. Use the timeline above to filter rows by date." position="left" />
            </div>
            <DataTable dataset={dataset} filteredRows={filteredRows} />
          </div>
        )}
        {activeView === 'charts' && (
          <div className="animate-in" style={{ height: '100%', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
              <InfoTooltip content="Generate bar, line, and scatter charts automatically based on your column data types. Press 'Play' on the timeline to watch them animate." position="left" />
            </div>
            <ChartPanel dataset={dataset} filteredRows={filteredRows} />
          </div>
        )}
        {activeView === 'map' && (
          <div className="animate-in" style={{ height: '100%', position: 'relative' }}>
            <HistoricalMapView dataset={dataset} filteredRows={filteredRows} />
          </div>
        )}
        {activeView === 'network' && (
          <div className="animate-in" style={{ height: '100%', position: 'relative' }}>
            <NetworkGraph dataset={dataset} filteredRows={filteredRows} />
          </div>
        )}
      </main>

      {/* Right Sidebar Toolkit */}
      <aside className={`workspace-sidebar-right ${isRightPaneExpanded ? '' : 'collapsed'}`}>
        {/* Toggle Button */}
        <button 
          className="sidebar-toggle-btn" 
          onClick={() => setIsRightPaneExpanded(!isRightPaneExpanded)}
          style={{ width: '100%', marginBottom: '1rem', background: isRightPaneExpanded ? 'transparent' : 'var(--bg-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.25rem' }}
          title="Toggle Context Toolkit"
        >
          {isRightPaneExpanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>

        {/* Toolkit Nav (When collapsed) */}
        {!isRightPaneExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%', alignItems: 'center' }}>
            <button 
              className={`sidebar-toggle-btn ${activeTool === 'columns' ? 'active-tool' : ''}`}
              onClick={() => { setActiveTool('columns'); setIsRightPaneExpanded(true); }}
              title="Column Data Types"
              style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}
            >
              <Columns size={20} />
            </button>
            <button 
              className={`sidebar-toggle-btn ${activeTool === 'ai' ? 'active-tool' : ''}`}
              onClick={() => { setActiveTool('ai'); setIsRightPaneExpanded(true); }}
              title="Analysis Toolkit"
              style={{ display: 'flex', justifyContent: 'center', padding: '0.5rem' }}
            >
              <Bot size={20} />
            </button>
          </div>
        )}

        {/* Toolkit Content (When Expanded) */}
        <div className="sidebar-content">
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button 
              className={`btn btn-sm ${activeTool === 'columns' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTool('columns')}
              style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.25rem', justifyContent: 'center' }}
            >
              <Columns size={16} /> Columns
            </button>
            <button 
              className={`btn btn-sm ${activeTool === 'ai' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTool('ai')}
              style={{ flex: 1, padding: '0 0.5rem' }}
            >
              <Bot size={16} /> Analysis Toolkit
            </button>
          </div>

          {activeTool === 'columns' && <ColumnMapper />}
          {activeTool === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <AIInsightsPanel dataset={dataset} filteredRows={filteredRows} />
              
              <div className="panel-section" style={{ borderStyle: 'dashed' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MessageSquare size={16} color="var(--text-muted)" />
                  <h4 style={{ margin: 0, fontSize: '0.875rem' }}>Chat with Data</h4>
                  <div style={{ marginLeft: 'auto' }}>
                    <InfoTooltip content="Soon you will be able to ask natural language questions about your data here." position="left" />
                  </div>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Ask questions about your dataset.
                </p>
                <div className="input" style={{ opacity: 0.5, fontSize: '0.75rem', padding: '0.5rem' }}>
                  Ask a question... (Coming soon)
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
