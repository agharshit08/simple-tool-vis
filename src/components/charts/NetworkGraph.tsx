'use client';

import { useEffect, useRef, useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { ParsedDataset, ColumnType } from '@/lib/csvParser';
import { useDataset } from '@/context/DatasetContext';
import { Sparkles, Plus, X, Maximize, Minimize, ChevronRight, ChevronLeft } from 'lucide-react';

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

interface Node { id: string; group: string; count: number; }
interface Link { source: string; target: string; value: number; }

// Column types that make sense as network nodes
const ENTITY_TYPES: ColumnType[] = ['entity', 'location', 'category', 'relationship', 'text'];

export default function NetworkGraph({ dataset, filteredRows, isFullscreen, onToggleFullscreen }: Props) {
  const { globalDataInsights, isGeneratingGlobalInsights, isAnalyzingColumns } = useDataset();
  const svgRef = useRef<SVGSVGElement>(null);

  // Pick default columns: prefer typed entity cols, fall back to any string col
  const allTextCols = dataset.columns.filter(c => ENTITY_TYPES.includes(c.type));
  const fallbackCols = dataset.columns.filter(c =>
    !['number', 'latitude', 'longitude'].includes(c.type)
  );
  const candidateCols = allTextCols.length >= 2 ? allTextCols : fallbackCols;

  const [relationships, setRelationships] = useState<{ source: string; target: string }[]>([
    { source: candidateCols[0]?.name || '', target: candidateCols[1]?.name || '' }
  ]);
  const [maxNodes, setMaxNodes] = useState(60);
  const [showIsolated, setShowIsolated] = useState(false);
  const [colorByUnique, setColorByUnique] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsed = isFullscreen && isCollapsed;
  const [layoutType, setLayoutType] = useState<'force' | 'hierarchical'>('force');
  const [edgeStyle, setEdgeStyle] = useState<'straight' | 'curved'>('straight');

  // Update defaults when dataset changes
  useEffect(() => {
    const cols = dataset.columns.filter(c => !['number', 'latitude', 'longitude'].includes(c.type));
    if (cols.length >= 2) {
      setRelationships([{ source: cols[0].name, target: cols[1].name }]);
    }
  }, [dataset.filename]);

  const { nodes, links } = useMemo(() => {
    const validRels = relationships.filter(r => r.source && r.target && r.source !== r.target);
    if (validRels.length === 0) return { nodes: [], links: [] };

    const nodeMap = new Map<string, { group: string; count: number }>();
    const linkMap = new Map<string, number>();

    filteredRows.forEach(row => {
      validRels.forEach(rel => {
        const n1 = row[rel.source]?.trim();
        const n2 = row[rel.target]?.trim();
        if (!n1 || !n2 || n1 === n2) return;

        if (!nodeMap.has(n1)) nodeMap.set(n1, { group: rel.source, count: 0 });
        if (!nodeMap.has(n2)) nodeMap.set(n2, { group: rel.target, count: 0 });
        nodeMap.get(n1)!.count++;
        nodeMap.get(n2)!.count++;

        const key = [n1, n2].sort().join('|||');
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
      });
    });

    const minCount = showIsolated ? 0 : 1;

    const sortedNodes = [...nodeMap.entries()]
      .filter(([, { count }]) => count > minCount)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, maxNodes);
    const nodeSet = new Set(sortedNodes.map(([id]) => id));

    const nodes: Node[] = sortedNodes.map(([id, { group, count }]) => ({ id, group, count }));
    const links: Link[] = [...linkMap.entries()]
      .map(([key, value]) => {
        const [source, target] = key.split('|||');
        return { source, target, value };
      })
      .filter(l => nodeSet.has(l.source) && nodeSet.has(l.target));

    return { nodes, links };
  }, [filteredRows, relationships, maxNodes, showIsolated]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    if (nodes.length === 0) return;

    const rect = svgRef.current.parentElement?.getBoundingClientRect();
    const width = rect?.width || 600;
    const height = rect?.height || 520;

    svg.attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g');
    
    // Semantic Zooming state
    let currentZoomScale = 1;
    
    svg.call(
      d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.1, 4])
        .on('zoom', (event) => {
          g.attr('transform', event.transform);
          currentZoomScale = event.transform.k;
          
          // Semantic zooming: show labels only when zoomed in, or for big nodes
          g.selectAll('text.node-label')
            .attr('opacity', (d: any) => {
               if (currentZoomScale > 1.5) return 1;
               if (d.count >= Math.max(1, maxCount * 0.1)) return 1;
               return Math.max(0, (currentZoomScale - 0.5) * 2);
            });
        }) as any
    );

    const groups = [...new Set(nodes.map(n => n.group))];
    const uniqueIds = nodes.map(n => n.id);
    const colorDomain = colorByUnique ? uniqueIds : groups;
    
    const defaultRange = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];
    const range = colorByUnique 
      ? d3.quantize(t => d3.interpolateRainbow(t * 0.8 + 0.1), Math.max(uniqueIds.length, 2))
      : defaultRange;

    const colorScale = d3.scaleOrdinal<string>()
      .domain(colorDomain)
      .range(range);

    const maxCount = Math.max(...nodes.map(n => n.count), 1);
    const sizeScale = d3.scaleSqrt().domain([0, maxCount]).range([4, 14]);
    const maxLinkVal = Math.max(...links.map(l => l.value), 1);

    // Prepare links array for D3 simulation
    const simulationLinks = links.map(d => Object.create(d));
    const simulationNodes = nodes.map(d => Object.create(d));

    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 18)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#88888840');

    // Layout Calculations
    let sim: d3.Simulation<d3.SimulationNodeDatum, undefined> | null = null;
    
    if (layoutType === 'force') {
      sim = d3.forceSimulation(simulationNodes as any)
        .force('link', d3.forceLink(simulationLinks as any).id((d: any) => d.id).distance(80).strength(0.7))
        .force('charge', d3.forceManyBody().strength(-180))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.count) + 6));

    } else if (layoutType === 'hierarchical') {
      // Dagre/Tree approximation using Y-stratification based on degree
      sim = d3.forceSimulation(simulationNodes as any)
        .force('link', d3.forceLink(simulationLinks as any).id((d: any) => d.id).distance(60).strength(1))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('y', d3.forceY((d: any) => {
          // Simple hierarchy based on node count (high count = top)
          return height * 0.2 + (1 - d.count / maxCount) * height * 0.6;
        }).strength(0.8))
        .force('x', d3.forceX(width / 2).strength(0.1))
        .force('collision', d3.forceCollide().radius((d: any) => sizeScale(d.count) + 6));
    }

    const linkGroup = g.append('g').attr('class', 'links');
    const linkPaths = linkGroup
      .selectAll('path')
      .data(simulationLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', (d: any) => {
        return colorScale(colorByUnique ? d.source.id : d.source.group);
      })
      .attr('stroke-opacity', 0.35)
      .attr('stroke-width', (d: any) => 0.8 + (d.value / maxLinkVal) * 3)
      .attr('stroke-linecap', 'round');

    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeElements = nodeGroup
      .selectAll<SVGGElement, any>('g')
      .data(simulationNodes)
      .join('g')
      .attr('cursor', 'pointer');
      
    if (true) {
      nodeElements.call(
        d3.drag<SVGGElement, any>()
          .on('start', (event, d) => {
            if (!event.active && sim) sim.alphaTarget(0.3).restart();
            d.fx = d.x; d.fy = d.y;
          })
          .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
          .on('end', (event, d) => {
            if (!event.active && sim) sim.alphaTarget(0);
            d.fx = null; d.fy = null;
          }) as any
      );
    }

    nodeElements.append('circle')
      .attr('r', (d: any) => sizeScale(d.count))
      .attr('fill', (d: any) => colorScale(colorByUnique ? d.id : d.group))
      .attr('fill-opacity', 0.9)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);

    nodeElements.append('text')
      .attr('class', 'node-label')
      .filter((d: any) => d.count >= Math.max(1, maxCount * 0.05))
      .text((d: any) => d.id.length > 16 ? d.id.slice(0, 15) + '…' : d.id)
      .attr('x', (d: any) => sizeScale(d.count) + 4)
      .attr('y', 4)
      .attr('font-size', (d: any) => Math.min(11, 8 + (d.count / maxCount) * 3) + 'px')
      .attr('font-family', 'Inter, sans-serif')
      .attr('fill', '#334155')
      .attr('pointer-events', 'none')
      .attr('paint-order', 'stroke')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2.5)
      .attr('opacity', 1);

    // Ego-Network Hover Logic
    nodeElements.on('mouseover', function(event, d) {
      d3.select(this).select('circle').transition().duration(120).attr('r', sizeScale(d.count) + 3).attr('stroke-width', 2.5);
      
      // Dim others
      nodeElements.transition().duration(200).style('opacity', o => {
        const isConnected = simulationLinks.some((l: any) => 
          (l.source.id === d.id && l.target.id === o.id) || 
          (l.target.id === d.id && l.source.id === o.id)
        );
        return isConnected || o.id === d.id ? 1 : 0.1;
      });
      linkPaths.transition().duration(200).style('opacity', (l: any) => 
        l.source.id === d.id || l.target.id === d.id ? 1 : 0.05
      );
      
      showTooltip(event, d);
    });

    nodeElements.on('mousemove', (event) => moveTooltip(event));

    nodeElements.on('mouseout', function(event, d) {
      d3.select(this).select('circle').transition().duration(120).attr('r', sizeScale(d.count)).attr('stroke-width', 1.5);
      
      // Restore opacity
      nodeElements.transition().duration(200).style('opacity', 1);
      linkPaths.transition().duration(200).style('opacity', 0.35);
      
      hideTooltip();
    });

    const wrapper = d3.select(svgRef.current.parentElement);
    const tooltip = wrapper.append('div')
      .style('position', 'absolute')
      .style('background', 'rgba(255,255,255,0.95)')
      .style('backdrop-filter', 'blur(8px)')
      .style('border', '1px solid rgba(0,0,0,0.1)')
      .style('box-shadow', '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)')
      .style('border-radius', '8px')
      .style('padding', '10px 14px')
      .style('font-family', 'Inter, sans-serif')
      .style('font-size', '12px')
      .style('color', '#1e293b')
      .style('pointer-events', 'none')
      .style('opacity', '0')
      .style('transition', 'opacity 0.15s ease')
      .style('z-index', '100')
      .style('max-width', '220px');

    function showTooltip(event: MouseEvent, d: any) {
      tooltip
        .style('opacity', '1')
        .html(`
          <div style="font-weight:600;color:${colorScale(colorByUnique ? d.id : d.group)};margin-bottom:4px">${d.id}</div>
          <div style="color:#64748b;font-size:11px">Group: <span style="color:#334155">${d.group}</span></div>
          <div style="color:#64748b;font-size:11px">Connections: <span style="color:#0f172a;font-weight:600">${d.count}</span></div>
        `);
      moveTooltip(event);
    }
    function moveTooltip(event: MouseEvent) {
      const parent = (svgRef.current?.parentElement as HTMLElement);
      const pr = parent?.getBoundingClientRect();
      if (!pr) return;
      tooltip
        .style('left', (event.clientX - pr.left + 14) + 'px')
        .style('top', (event.clientY - pr.top - 10) + 'px');
    }
    function hideTooltip() { tooltip.style('opacity', '0'); }

    // Update function for positions
    const updatePositions = () => {
      linkPaths.attr('d', (d: any) => {
        if (edgeStyle === 'curved') {
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy);
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        } else {
          return `M${d.source.x},${d.source.y}L${d.target.x},${d.target.y}`;
        }
      });
      nodeElements.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    };

    if (sim) {
      sim.on('tick', updatePositions);
    } else {
      // Static layout
      updatePositions();
    }

    return () => {
      if (sim) sim.stop();
      tooltip.remove();
    };
  }, [nodes, links, colorByUnique, layoutType, edgeStyle]);

  const colOptions = dataset.columns.filter(c =>
    !['latitude', 'longitude', 'number'].includes(c.type)
  );

  const addRelationship = () => {
    setRelationships([...relationships, { source: colOptions[0]?.name || '', target: colOptions[1]?.name || '' }]);
  };

  const updateRelationship = (index: number, field: 'source' | 'target', value: string) => {
    const newRels = [...relationships];
    newRels[index][field] = value;
    setRelationships(newRels);
  };

  const removeRelationship = (index: number) => {
    const newRels = relationships.filter((_, i) => i !== index);
    if (newRels.length === 0) {
      newRels.push({ source: colOptions[0]?.name || '', target: colOptions[1]?.name || '' });
    }
    setRelationships(newRels);
  };

  if (isAnalyzingColumns) {
    return (
      <div style={{ display: 'flex', gap: '1rem', height: '100%', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', zIndex: 10,
          background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(4px)',
          borderRadius: 'var(--radius-lg)'
        }}>
          <div className="spinner" style={{ width: '32px', height: '32px', border: '3px solid var(--gold)', borderTopColor: 'transparent', marginBottom: '1rem' }} />
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>Analyzing Network Nodes...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>Identifying relationships and entity classifications</p>
        </div>
        <div className="chart-card" style={{ flex: '1 1 70%', padding: '1.5rem' }}>
          <div className="animate-shimmer" style={{ height: '24px', width: '200px', borderRadius: '6px', marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            <div className="animate-shimmer" style={{ height: '32px', width: '160px', borderRadius: '4px' }} />
            <div className="animate-shimmer" style={{ height: '32px', width: '160px', borderRadius: '4px' }} />
          </div>
          <div style={{ width: '100%', height: 'calc(100% - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="animate-shimmer" style={{ width: '400px', height: '400px', borderRadius: '50%', opacity: 0.1 }} />
          </div>
        </div>
        <div className="chart-card" style={{ flex: '1 1 30%', minWidth: '320px', padding: '1.5rem' }}>
          <div className="animate-shimmer" style={{ height: '20px', width: '140px', borderRadius: '4px', marginBottom: '1.5rem' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                <div className="animate-shimmer" style={{ height: '14px', width: '90%', borderRadius: '4px', marginBottom: '0.5rem' }} />
                <div className="animate-shimmer" style={{ height: '14px', width: '60%', borderRadius: '4px', marginBottom: '1rem' }} />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div className="animate-shimmer" style={{ height: '24px', width: '80px', borderRadius: '12px' }} />
                  <div className="animate-shimmer" style={{ height: '24px', width: '80px', borderRadius: '12px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: '1rem', height: '100%' }}>
      {/* Main Graph Area */}
      <div className="network-graph-widget animate-in" style={{ 
        flex: '1 1 70%',
        display: 'flex', 
        flexDirection: 'column',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {isFullscreen && onToggleFullscreen && (
          <button 
            onClick={onToggleFullscreen}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              zIndex: 1000,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)',
              color: 'var(--text-secondary)'
            }}
            title="Close Full Screen"
          >
            <X size={18} />
          </button>
        )}
        {collapsed ? (
          <div style={{ position: 'absolute', bottom: '2rem', right: '2rem', zIndex: 10000 }}>
            <button 
              onClick={() => setIsCollapsed(false)}
              style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}
              title="Expand Controls"
            >
              <ChevronLeft size={18} />
            </button>
          </div>
        ) : (
        <div className={isFullscreen ? `floating-widget floating-bottom-right` : ''} style={{
          padding: '1rem 1.25rem',
          borderBottom: isFullscreen ? 'none' : '1px solid var(--border)',
          background: 'var(--bg-card)',
          width: isFullscreen ? '450px' : 'auto',
          ...(isFullscreen ? { position: 'absolute' as any, bottom: 0, right: 0 } : {})
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Network Relationships</h3>
              {isFullscreen && (
                <button 
                  onClick={() => setIsCollapsed(true)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', marginLeft: '2px', display: 'flex' }}
                  title="Collapse"
                >
                  <ChevronRight size={16} />
                </button>
              )}
              {onToggleFullscreen && (
                <button 
                  onClick={onToggleFullscreen} 
                  className="btn btn-ghost btn-sm" 
                  style={{ padding: '4px', height: 'auto', minHeight: 'auto', color: 'var(--text-muted)' }}
                  title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', marginRight: '0.5rem' }}>
                <input 
                  type="checkbox" 
                  id="colorByUnique" 
                  checked={colorByUnique} 
                  onChange={e => setColorByUnique(e.target.checked)} 
                  style={{ accentColor: 'var(--text-primary)', width: '14px', height: '14px' }}
                />
                <label htmlFor="colorByUnique" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Unique Colors
                </label>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select className="input select" value={layoutType} onChange={e => setLayoutType(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="force">Force Layout</option>
              <option value="hierarchical">Hierarchical Layout</option>
            </select>
            <select className="input select" value={edgeStyle} onChange={e => setEdgeStyle(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="straight">Straight Edges</option>
              <option value="curved">Curved Edges</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {relationships.map((rel, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <select
                  className="input select"
                  value={rel.source}
                  onChange={e => updateRelationship(index, 'source', e.target.value)}
                  style={{ fontSize: '0.8125rem', padding: '4px 32px 4px 8px', width: '160px', border: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  {colOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>→</span>
                <select
                  className="input select"
                  value={rel.target}
                  onChange={e => updateRelationship(index, 'target', e.target.value)}
                  style={{ fontSize: '0.8125rem', padding: '4px 32px 4px 8px', width: '160px', border: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-primary)' }}
                >
                  {colOptions.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
                {relationships.length > 1 && (
                  <button onClick={() => removeRelationship(index)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '0.25rem' }}>
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            <div>
              <button 
                onClick={addRelationship}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: 'none',
                  color: 'var(--gold)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', padding: '0.25rem 0',
                  marginTop: '0.25rem'
                }}
              >
                <Plus size={14} /> Add Relationship
              </button>
            </div>
          </div>
        </div>
        )}

        {/* Bottom panel: SVG canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'transparent' }}>
          {nodes.length > 0 ? (
            <svg
              ref={svgRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
              aria-label="Network graph visualization"
            />
          ) : (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: '1rem', height: '100%',
            }}>
              <div style={{ fontSize: '3rem', opacity: 0.5 }}>🕸️</div>
              <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, color: 'var(--text-primary)' }}>No connections found</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '340px', textAlign: 'center', lineHeight: 1.5 }}>
                Configure valid source and target relationships to build the network.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar: AI Suggestions */}
      {!isFullscreen && (
        <div className="network-insights-sidebar animate-in" style={{ 
          flex: '0 0 30%', 
          maxWidth: '350px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Suggested Networks</h3>
        </div>
        
        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
          {isGeneratingGlobalInsights && (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Analysing dataset for networks...</p>
            </div>
          )}

          {!isGeneratingGlobalInsights && globalDataInsights?.networkRecommendations?.length === 0 && (
             <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
              No specific multi-node networks were recommended for this dataset. You can manually build them on the left.
             </p>
          )}

          {!isGeneratingGlobalInsights && globalDataInsights?.networkRecommendations && globalDataInsights.networkRecommendations.map((rec, i) => (
            <div 
              key={i} 
              className="insight-card"
              onClick={() => setRelationships(rec.relationships)}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {rec.reason}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {rec.relationships.map((r, ri) => (
                  <div key={ri} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', overflow: 'hidden' }}>
                    <span className="badge badge-gold" title={r.source} style={{ flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontFamily: 'var(--font-sans)', textTransform: 'none' }}>{r.source}</span>
                    <span style={{ flexShrink: 0 }}>→</span>
                    <span className="badge badge-gold" title={r.target} style={{ flex: '0 1 auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.7rem', fontFamily: 'var(--font-sans)', textTransform: 'none' }}>{r.target}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Fallback to simple chartRecommendations if networkRecommendations are missing */}
          {!isGeneratingGlobalInsights && !globalDataInsights?.networkRecommendations?.length && globalDataInsights?.chartRecommendations?.filter(c => c.type === 'network').map((rec, i) => (
            <div 
              key={`fallback-${i}`} 
              className="insight-card"
              onClick={() => {
                if (rec.columns.length >= 2) {
                  setRelationships([{ source: rec.columns[0], target: rec.columns[1] }]);
                }
              }}
              style={{
                background: 'var(--bg-main)',
                border: '1px solid var(--border)',
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                marginBottom: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                {rec.reason}
              </p>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>{rec.columns[0]}</span>
                <span>→</span>
                <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>{rec.columns[1]}</span>
              </div>
            </div>
          ))}

        </div>
      </div>
      )}
    </div>
  );
}
