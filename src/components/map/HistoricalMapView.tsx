'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import type { ParsedDataset } from '@/lib/csvParser';
import { geocodeCities, type GeoResult } from '@/lib/geocoder';
import { ERA_CONFIGS, ERA_ORDER, getEraForYear, type HistoricalEra } from '@/lib/historicalMaps';
import { useDataset } from '@/context/DatasetContext';

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Props { 
  dataset: ParsedDataset; 
  filteredRows: Record<string, string>[];
}

interface MarkerData {
  locationName: string;
  lat: number;
  lng: number;
  source: string;
  rows: Record<string, string>[];
  count: number;
}

function TileLayerUpdater({ era, overlayOpacity }: { era: HistoricalEra; overlayOpacity: number }) {
  const map = useMap();
  const layersRef = useRef<{ base?: L.TileLayer; overlay?: L.TileLayer }>({});

  useEffect(() => {
    // 1. Initialize modern base layer once
    if (!layersRef.current.base) {
      const baseConfig = ERA_CONFIGS['modern'];
      const baseLayer = L.tileLayer(baseConfig.tileUrl, {
        attribution: baseConfig.tileAttribution,
        opacity: 1,
        subdomains: 'abc',
      });
      baseLayer.addTo(map);
      layersRef.current.base = baseLayer;
    }

    // 2. Handle historical overlay layer
    if (era === 'modern') {
      if (layersRef.current.overlay) {
        map.removeLayer(layersRef.current.overlay);
        layersRef.current.overlay = undefined;
      }
    } else {
      const config = ERA_CONFIGS[era];
      if (layersRef.current.overlay) {
        // If era changed, recreate overlay
        if ((layersRef.current.overlay as any)._url !== config.tileUrl) {
          map.removeLayer(layersRef.current.overlay);
          const newOverlay = L.tileLayer(config.tileUrl, {
            attribution: config.tileAttribution,
            opacity: overlayOpacity,
            subdomains: 'abc',
          });
          newOverlay.addTo(map);
          layersRef.current.overlay = newOverlay;
        }
      } else {
        // Create initial overlay
        const newOverlay = L.tileLayer(config.tileUrl, {
          attribution: config.tileAttribution,
          opacity: overlayOpacity,
          subdomains: 'abc',
        });
        newOverlay.addTo(map);
        layersRef.current.overlay = newOverlay;
      }
    }
  }, [era, map]); // Don't trigger on overlayOpacity changes

  // 3. Smooth opacity updates
  useEffect(() => {
    if (layersRef.current.overlay) {
      layersRef.current.overlay.setOpacity(overlayOpacity);
    }
  }, [overlayOpacity]);

  return null;
}

export default function HistoricalMapView({ dataset, filteredRows }: Props) {
  const { selectedYear } = useDataset();
  const [era, setEra] = useState<HistoricalEra>('1600s');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(0.8);
  const [geoJson, setGeoJson] = useState<any>(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeProgress, setGeocodeProgress] = useState(0);
  const [filter, setFilter] = useState('');

  // Auto-set era from selected year
  useEffect(() => {
    // If we have a global selectedYear, use that to guess era. Otherwise default to 1600s or previous era.
    const year = selectedYear || 1620;
    const newEra = getEraForYear(year);
    setEra(newEra);
    if (newEra !== 'modern') setOverlayOpacity(ERA_CONFIGS[newEra].opacity);
  }, [selectedYear]);

  // Load GeoJSON boundaries
  useEffect(() => {
    const config = ERA_CONFIGS[era];
    if (!config.geojsonUrl) { setGeoJson(null); return; }
    fetch(config.geojsonUrl)
      .then(r => r.json())
      .then(data => { setGeoJson(data); setGeoJsonKey(k => k + 1); })
      .catch(() => setGeoJson(null));
  }, [era]);

  // Find location & coordinate columns
  const { locCols, latCol, lngCol } = useMemo(() => {
    const locCols = dataset.columns.filter(c => c.type === 'location');
    const latCol = dataset.columns.find(c => c.type === 'latitude');
    const lngCol = dataset.columns.find(c => c.type === 'longitude');
    return { locCols, latCol, lngCol };
  }, [dataset]);

  // Detect year range (kept for reference, though filteredRows comes from dashboard)
  const { minYear, maxYear, yearCol } = useMemo(() => {
    const yearColDef = dataset.columns.find(c => c.type === 'year' || c.type === 'date');
    if (!yearColDef) return { minYear: 1400, maxYear: 1900, yearCol: null };
    const years = dataset.rows.map(r => parseInt(r[yearColDef.name])).filter(y => !isNaN(y) && y > 0);
    return { minYear: Math.min(...years, 1400), maxYear: Math.max(...years, 1900), yearCol: yearColDef.name };
  }, [dataset]);

  // Geocode and build markers
  useEffect(() => {
    const rows = filteredRows;
    if (!rows.length) return;

    // If we have explicit lat/lng cols, use directly
    if (latCol && lngCol) {
      const markerMap = new Map<string, MarkerData>();
      rows.forEach(r => {
        const lat = parseFloat(r[latCol.name]);
        const lng = parseFloat(r[lngCol.name]);
        const name = locCols[0] ? r[locCols[0].name] : `${lat},${lng}`;
        if (!isNaN(lat) && !isNaN(lng)) {
          const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (!markerMap.has(key)) markerMap.set(key, { locationName: name, lat, lng, source: 'coordinates', rows: [], count: 0 });
          const m = markerMap.get(key)!;
          m.rows.push(r);
          m.count++;
        }
      });
      setMarkers([...markerMap.values()]);
      return;
    }

    if (locCols.length === 0) return;

    // Collect all location names
    const allLocations = rows.flatMap(r => locCols.map(c => r[c.name]).filter(Boolean));
    const uniqueLocations = [...new Set(allLocations)];

    setGeocoding(true);
    setGeocodeProgress(0);

    const yearHint = selectedYear || undefined;
    geocodeCities(uniqueLocations, yearHint, (done, total) => {
      setGeocodeProgress(Math.round((done / total) * 100));
    }).then(geoResults => {
      const markerMap = new Map<string, MarkerData>();
      rows.forEach(r => {
        locCols.forEach(col => {
          const loc = r[col.name];
          if (!loc) return;
          const geo = geoResults.get(loc);
          if (!geo) return;
          const key = `${geo.lat.toFixed(3)},${geo.lng.toFixed(3)}`;
          if (!markerMap.has(key)) {
            markerMap.set(key, { locationName: loc, lat: geo.lat, lng: geo.lng, source: geo.source, rows: [], count: 0 });
          }
          const m = markerMap.get(key)!;
          m.rows.push(r);
          m.count++;
        });
      });
      setMarkers([...markerMap.values()]);
    }).finally(() => setGeocoding(false));
  }, [filteredRows, locCols, latCol, lngCol, selectedYear]);

  const filteredMarkers = useMemo(() =>
    !filter ? markers : markers.filter(m => m.locationName.toLowerCase().includes(filter.toLowerCase())),
    [markers, filter]
  );

  const maxCount = Math.max(...markers.map(m => m.count), 1);

  const geoJsonStyle = {
    color: '#c9a84c',
    weight: 1,
    opacity: 0.5,
    fillColor: '#c9a84c',
    fillOpacity: 0.04,
  };

  return (
    <div className="historical-map-widget animate-in" style={{ 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%', 
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      background: 'var(--bg-card)',
      boxShadow: 'var(--shadow-sm)',
      overflow: 'hidden'
    }}>
      {/* Top panel: Info & Controls */}
      <div style={{
        padding: '1rem 1.25rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '2rem',
        flexWrap: 'wrap'
      }}>
        {/* Title & Instructions */}
        <div style={{ flex: '1 1 200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>Geospatial Map</h3>
          </div>
          <p style={{ margin: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
            Geocoding locations from your dataset. Circle sizes indicate the frequency of records.
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Historical Era</label>
            <select
              className="input select"
              style={{ fontSize: '0.8125rem', padding: '4px 32px 4px 8px', width: '140px', border: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-primary)', cursor: 'pointer' }}
              value={era}
              onChange={e => setEra(e.target.value as HistoricalEra)}
              id="era-selector"
              aria-label="Select historical era"
            >
              {ERA_ORDER.map(e => (
                <option key={e} value={e}>{ERA_CONFIGS[e].label}</option>
              ))}
            </select>
          </div>

          {era !== 'modern' && (
            <div style={{ width: '120px' }}>
              <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                <span>Opacity</span>
                <span style={{ color: 'var(--text-primary)' }}>{Math.round(overlayOpacity * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={overlayOpacity}
                onChange={e => setOverlayOpacity(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--primary)' }}
                aria-label="Historical map opacity"
              />
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Filter Cities</label>
            <input
              className="input"
              type="text"
              placeholder="Search city..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              style={{ fontSize: '0.8125rem', padding: '4px 8px', width: '140px', border: '1px solid var(--border)' }}
              id="map-city-filter"
              aria-label="Filter cities"
            />
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', marginLeft: 'auto' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {geocoding && (
              <span className="badge badge-gold" style={{ fontSize: '0.65rem' }}>
                <span className="spinner" style={{ width: 10, height: 10 }} />
                Geocoding {geocodeProgress}%
              </span>
            )}
            <span className="badge badge-muted" style={{ fontSize: '0.65rem' }}>{filteredMarkers.length} locations</span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: '1.5rem', left: '1rem', zIndex: 1000,
        background: 'var(--bg-main)', border: '1px solid var(--border)',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
        borderRadius: 'var(--radius-lg)',
        padding: '0.75rem 1rem', fontSize: '0.7rem',
      }}>
        <div style={{ color: 'var(--text-primary)', marginBottom: '0.5rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Legend</div>
        {[
          { color: '#c9a84c', label: 'Alias table' },
          { color: '#2d7a7a', label: 'Smart Insights' },
          { color: '#8b2635', label: 'Nominatim' },
          { color: '#4a3f8a', label: 'Coordinates' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '3px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
            <span style={{ color: 'var(--text-muted)' }}>{label}</span>
          </div>
        ))}
        <div style={{ marginTop: '0.5rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
          Bubble size = frequency
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', background: 'transparent' }}>
        <MapContainer
          center={[30, 15]}
          zoom={3}
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayerUpdater era={era} overlayOpacity={overlayOpacity} />

          {geoJson && (
            <GeoJSON
              key={geoJsonKey}
              data={geoJson}
              style={() => geoJsonStyle}
              onEachFeature={(feature, layer) => {
                if (feature.properties?.NAME || feature.properties?.name) {
                  layer.bindTooltip(
                    `<div style="font-family:Inter;font-size:11px;color:#e8e0d0;background:#1a1a2e;padding:4px 8px;border-radius:4px;border:1px solid #c9a84c40">
                      ${feature.properties.NAME || feature.properties.name}
                    </div>`,
                    { sticky: true, opacity: 1, className: '' }
                  );
                }
              }}
            />
          )}

          {filteredMarkers.map((m, i) => {
            const radius = 6 + (m.count / maxCount) * 18;
            const sourceColors: Record<string, string> = {
              alias: '#c9a84c',
              gemini: '#2d7a7a',
              nominatim: '#8b2635',
              coordinates: '#4a3f8a',
            };
            const color = sourceColors[m.source] || '#c9a84c';

            return (
              <CircleMarker
                key={`${m.locationName}-${i}`}
                center={[m.lat, m.lng]}
                radius={radius}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.7,
                  weight: 2,
                }}
              >
                <Popup>
                  <div style={{ fontFamily: 'var(--font-sans)', minWidth: '160px' }}>
                    <strong style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>{m.locationName}</strong>
                    <hr style={{ border: 'none', borderTop: '1px solid rgba(201,168,76,0.2)', margin: '6px 0' }} />
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      <div>📍 {m.lat.toFixed(4)}, {m.lng.toFixed(4)}</div>
                      <div>📊 {m.count} record{m.count !== 1 ? 's' : ''}</div>
                      <div>🔍 Source: {m.source}</div>
                    </div>
                    {m.rows.slice(0, 3).map((row, ri) => (
                      <div key={ri} style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {Object.entries(row).slice(0, 3).map(([k, v]) => (
                          <div key={k}><span style={{ color: 'var(--gold)' }}>{k}:</span> {v}</div>
                        ))}
                      </div>
                    ))}
                    {m.rows.length > 3 && <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '4px' }}>+{m.rows.length - 3} more records</div>}
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {markers.length === 0 && !geocoding && (
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'var(--bg-main)', border: '1px solid var(--border)',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
            borderRadius: 'var(--radius-lg)',
            padding: '2rem', textAlign: 'center', zIndex: 999,
          }}>
            <div style={{ fontSize: '3rem', opacity: 0.5 }}>🗺️</div>
            <h3 style={{ fontFamily: 'var(--font-serif)', margin: 0, color: 'var(--text-primary)' }}>No Locations Detected</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '340px', textAlign: 'center', lineHeight: 1.5 }}>
              Make sure your dataset has columns typed as <strong>city</strong>, <strong>latitude</strong>, or <strong>longitude</strong> in the Column Mapper.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
