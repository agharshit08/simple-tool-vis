import sys

file_path = "src/components/charts/NetworkGraph.tsx"
with open(file_path, "r") as f:
    content = f.read()

# 1. State Additions
state_target = """  const [showIsolated, setShowIsolated] = useState(false);
  const [colorByUnique, setColorByUnique] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsed = isFullscreen && isCollapsed;"""

state_replacement = """  const [showIsolated, setShowIsolated] = useState(false);
  const [colorByUnique, setColorByUnique] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const collapsed = isFullscreen && isCollapsed;
  const [layoutType, setLayoutType] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [edgeStyle, setEdgeStyle] = useState<'straight' | 'curved'>('straight');"""

content = content.replace(state_target, state_replacement)

# 2. UI Controls
controls_target = """                <label htmlFor="colorByUnique" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Unique Colors
                </label>
              </div>
            </div>
          </div>"""

controls_replacement = """                <label htmlFor="colorByUnique" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                  Unique Colors
                </label>
              </div>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <select className="input select" value={layoutType} onChange={e => setLayoutType(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="force">Force Layout</option>
              <option value="circular">Circular Layout</option>
              <option value="hierarchical">Hierarchical Layout</option>
            </select>
            <select className="input select" value={edgeStyle} onChange={e => setEdgeStyle(e.target.value as any)} style={{ fontSize: '0.75rem', padding: '4px 8px', flex: 1, border: '1px solid var(--border)', background: 'var(--bg-main)' }}>
              <option value="straight">Straight Edges</option>
              <option value="curved">Curved Edges</option>
            </select>
          </div>"""

content = content.replace(controls_target, controls_replacement)

# 3. useEffect Block (Extraction and Replace)
import re

effect_pattern = re.compile(r"  useEffect\(\(\) => \{\n    if \(\!svgRef\.current\) return;\n.*?  \}, \[nodes, links, colorByUnique\]\);\n", re.DOTALL)

new_effect = """  useEffect(() => {
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
    } else if (layoutType === 'circular') {
      // Sort nodes by group
      simulationNodes.sort((a, b) => a.group.localeCompare(b.group));
      const radius = Math.min(width, height) / 2.5;
      simulationNodes.forEach((n: any, i) => {
        const angle = (i / simulationNodes.length) * 2 * Math.PI;
        n.x = width / 2 + radius * Math.cos(angle);
        n.y = height / 2 + radius * Math.sin(angle);
      });
      // Need a static setup, no simulation required.
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
      
    if (layoutType !== 'circular') {
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
"""

if effect_pattern.search(content):
    content = effect_pattern.sub(new_effect, content)
    with open(file_path, "w") as f:
        f.write(content)
    print("Success")
else:
    print("Failed to find useEffect pattern")

