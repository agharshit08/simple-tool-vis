"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Tooltip,
  useMap,
  Polyline,
  Popup,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type { ParsedDataset } from "@/lib/csvParser";
import { geocodeCitiesBulk, type GeoResult } from "@/lib/geocoder";
import {
  ERA_CONFIGS,
  ERA_ORDER,
  getEraForYear,
  type HistoricalEra,
} from "@/lib/historicalMaps";
import { useDataset } from "@/context/DatasetContext";
import { Play, Map as MapIcon, X, MapPin, Database, Search } from "lucide-react";

const MAP_STYLES = {
  voyager: { name: "CARTO Voyager", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" },
  physical: { name: "Terrain Physical", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}" },
  topo: { name: "Esri Topo (Blue Ocean)", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}" },
  satellite: { name: "Satellite Imagery", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" },
  osm: { name: "Standard (OSM)", url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" },
};
type MapStyleKey = keyof typeof MAP_STYLES;

// Fix Leaflet default icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

interface MarkerData {
  locationName: string;
  lat: number;
  lng: number;
  colName: string;
  source: string;
  rows: Record<string, string>[];
  count: number;
}

// TileLayerUpdater has been removed to keep a clean, modern base map.

const COLUMN_COLORS = [
  "#c9a84c",
  "#2d7a7a",
  "#8b2635",
  "#4a3f8a",
  "#c2592d",
  "#4b5563",
  "#10b981",
];

export default function HistoricalMapView({ dataset, filteredRows }: Props) {
  const {
    selectedYear,
    geocodedLocations,
    setGeocodedLocations,
    isMapping,
    setIsMapping,
    mappingProgress,
    setMappingProgress,
    mappingAbortController,
    setMappingAbortController,
  } = useDataset();

  const [era, setEra] = useState<HistoricalEra>("modern");
  const [mapStyle, setMapStyle] = useState<MapStyleKey>("voyager");
  const [geoJson, setGeoJson] = useState<any>(null);
  const [geoJsonKey, setGeoJsonKey] = useState(0);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<MarkerData | null>(null);

  const { isAnalyzingColumns } = useDataset();

  // Auto-set era from selected year
  useEffect(() => {
    if (selectedYear) {
      setEra(getEraForYear(selectedYear));
    }
  }, [selectedYear]);

  // Load GeoJSON boundaries
  useEffect(() => {
    const config = ERA_CONFIGS[era];
    if (!config.geojsonUrl) {
      setGeoJson(null);
      return;
    }
    fetch(config.geojsonUrl)
      .then((r) => r.json())
      .then((data) => {
        setGeoJson(data);
        setGeoJsonKey((k) => k + 1);
      })
      .catch(() => setGeoJson(null));
  }, [era]);

  // Find location & coordinate columns
  const { locCols, latCol, lngCol, allCols } = useMemo(() => {
    const locCols = dataset.columns.filter((c) => c.type === "location");
    const latCol = dataset.columns.find((c) => c.type === "latitude");
    const lngCol = dataset.columns.find((c) => c.type === "longitude");
    return { locCols, latCol, lngCol, allCols: dataset.columns };
  }, [dataset]);

  const [selectedLocCols, setSelectedLocCols] = useState<string[]>([]);

  // Update selected col when dataset changes or finishes loading columns
  useEffect(() => {
    if (
      dataset.filename &&
      dataset.columns.length > 0 &&
      selectedLocCols.length === 0
    ) {
      const defaultLoc = dataset.columns.filter((c) => c.type === "location")[0]
        ?.name;
      setSelectedLocCols(defaultLoc ? [defaultLoc] : []);
    }
  }, [dataset.filename, dataset.columns.length]);

  const handleStartMapping = async () => {
    if (isMapping || selectedLocCols.length === 0) return;

    // Extract unique locations from all dataset rows for ALL selected columns
    const allLocations = dataset.rows
      .flatMap((r) => selectedLocCols.map((col) => r[col]))
      .filter(Boolean);
    const uniqueLocations = [...new Set(allLocations)];

    // Filter out ones we already have (including ones that failed and returned null)
    const pendingLocations = uniqueLocations.filter(
      (loc) => geocodedLocations[loc] === undefined,
    );

    if (pendingLocations.length === 0) return; // Nothing to do

    setIsMapping(true);
    setMappingProgress(0);

    const abortController = new AbortController();
    setMappingAbortController(abortController);

    // Process in chunks of 30
    const CHUNK_SIZE = 30;
    let processed = 0;
    const total = pendingLocations.length;

    try {
      for (let i = 0; i < pendingLocations.length; i += CHUNK_SIZE) {
        if (abortController.signal.aborted) break;

        const chunk = pendingLocations.slice(i, i + CHUNK_SIZE);

        // Pass selectedYear as a hint if available
        const geoResults = await geocodeCitiesBulk(
          chunk,
          selectedYear || undefined,
        );

        if (abortController.signal.aborted) break;

        setGeocodedLocations((prev) => ({ ...prev, ...geoResults }));
        processed += chunk.length;
        setMappingProgress(Math.round((processed / total) * 100));
      }
    } finally {
      if (!abortController.signal.aborted) {
        setIsMapping(false);
        setMappingProgress(100);
        setMappingAbortController(null);
      }
    }
  };

  // Build markers from filteredRows
  useEffect(() => {
    const rows = filteredRows;
    if (!rows.length) {
      setMarkers([]);
      return;
    }

    const markerMap = new Map<string, MarkerData>();

    // If explicit Lat/Lng columns are selected, plot them
    if (latCol && lngCol) {
      rows.forEach((r) => {
        const lat = parseFloat(r[latCol.name]);
        const lng = parseFloat(r[lngCol.name]);
        const name =
          selectedLocCols.length > 0 ? r[selectedLocCols[0]] : `${lat},${lng}`;
        if (!isNaN(lat) && !isNaN(lng)) {
          const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
          if (!markerMap.has(key))
            markerMap.set(key, {
              locationName: name,
              lat,
              lng,
              colName: "Coordinates",
              source: "coordinates",
              rows: [],
              count: 0,
            });
          const m = markerMap.get(key)!;
          m.rows.push(r);
          m.count++;
        }
      });
    }

    // Now plot from geocodedLocations for the selectedLocCols
    selectedLocCols.forEach((col) => {
      rows.forEach((r) => {
        const locName = r[col];
        if (!locName) return;

        const geo = geocodedLocations[locName];
        if (geo && typeof geo.lat === "number" && typeof geo.lng === "number") {
          const key = `${col}-${geo.lat.toFixed(3)},${geo.lng.toFixed(3)}`;
          if (!markerMap.has(key)) {
            markerMap.set(key, {
              locationName: locName,
              lat: geo.lat,
              lng: geo.lng,
              colName: col,
              source: geo.source,
              rows: [],
              count: 0,
            });
          }
          const m = markerMap.get(key)!;
          m.rows.push(r);
          m.count++;
        }
      });
    });

    setMarkers([...markerMap.values()]);
  }, [filteredRows, selectedLocCols, latCol, lngCol, geocodedLocations]);

  const flowLines = useMemo(() => {
    if (selectedLocCols.length !== 2 || !filteredRows.length) return [];
    
    const linesMap = new Map<string, { start: [number, number]; end: [number, number]; count: number; startLoc: string; endLoc: string }>();

    filteredRows.forEach((r) => {
      const startLoc = r[selectedLocCols[0]];
      const endLoc = r[selectedLocCols[1]];
      if (startLoc && endLoc && startLoc !== endLoc) {
        const startGeo = geocodedLocations[startLoc];
        const endGeo = geocodedLocations[endLoc];
        if (startGeo?.lat && startGeo?.lng && endGeo?.lat && endGeo?.lng) {
          const key = `${startLoc}->${endLoc}`;
          if (!linesMap.has(key)) {
            linesMap.set(key, {
              start: [startGeo.lat, startGeo.lng],
              end: [endGeo.lat, endGeo.lng],
              startLoc,
              endLoc,
              count: 0
            });
          }
          linesMap.get(key)!.count++;
        }
      }
    });
    return Array.from(linesMap.values());
  }, [filteredRows, selectedLocCols, geocodedLocations]);

  const allLocs = useMemo(() => {
    return [
      ...new Set(
        dataset.rows
          .flatMap((r) => selectedLocCols.map((col) => r[col]))
          .filter(Boolean),
      ),
    ];
  }, [dataset.rows, selectedLocCols]);

  const unmappedCount = useMemo(() => {
    return allLocs.filter((l) => geocodedLocations[l] === undefined).length;
  }, [allLocs, geocodedLocations]);

  const filteredMarkers = useMemo(
    () =>
      !filter
        ? markers
        : markers.filter((m) =>
            m.locationName.toLowerCase().includes(filter.toLowerCase()),
          ),
    [markers, filter],
  );

  const maxCount = Math.max(...markers.map((m) => m.count), 1);

  const geoJsonStyle = {
    color: "#c9a84c",
    weight: 1,
    opacity: 0.5,
    fillColor: "#c9a84c",
    fillOpacity: 0.04,
  };

  return (
    <div
      className="historical-map-widget animate-in"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        background: "var(--bg-card)",
        boxShadow: "var(--shadow-sm)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {isAnalyzingColumns && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: 'rgba(255, 255, 255, 0.7)', 
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            className="spinner"
            style={{ width: '32px', height: '32px', border: '3px solid var(--gold)', borderTopColor: 'transparent', marginBottom: '1rem' }}
          />
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 600 }}>Analyzing Geography...</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Identifying spatial and location data
          </p>
        </div>
      )}
      {/* Top panel: Info & Controls */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: "2rem",
          flexWrap: "wrap",
        }}
      >
        {/* Title & Instructions */}
        <div style={{ flex: "1 1 200px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.25rem",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "var(--text-primary)",
              }}
            >
              Geospatial Map
            </h3>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: "0.65rem",
              color: "var(--text-muted)",
            }}
          >
            Geocoding locations from your dataset. Circle sizes indicate the
            frequency of records.
          </p>
        </div>

        {/* Controls */}
        <div
          style={{
            display: "flex",
            gap: "1.25rem",
            flexWrap: "wrap",
            alignItems: "flex-start",
          }}
        >
          <div>
            <label
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              Location Columns
            </label>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {locCols.length === 0 ? (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--text-muted)",
                    padding: "4px 0",
                  }}
                >
                  No location columns found
                </span>
              ) : null}
              {locCols.map((c) => {
                const isSelected = selectedLocCols.includes(c.name);
                const colorIdx = selectedLocCols.indexOf(c.name);
                const colColor = isSelected
                  ? COLUMN_COLORS[colorIdx % COLUMN_COLORS.length]
                  : "var(--border)";
                return (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedLocCols((prev) =>
                          prev.filter((p) => p !== c.name),
                        );
                      } else {
                        setSelectedLocCols((prev) => [...prev, c.name]);
                      }
                    }}
                    disabled={isMapping}
                    style={{
                      padding: "4px 10px",
                      fontSize: "0.75rem",
                      background: isSelected ? `${colColor}20` : "transparent",
                      color: isSelected ? colColor : "var(--text-muted)",
                      border: `1px solid ${isSelected ? colColor : "var(--border)"}`,
                      borderRadius: "16px",
                      cursor: isMapping ? "default" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: colColor,
                        }}
                      />
                    )}
                    {c.name}
                  </button>
                );
              })}

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  marginLeft: "0.5rem",
                }}
              >
                <button
                  type="button"
                  onClick={handleStartMapping}
                  disabled={
                    isMapping ||
                    selectedLocCols.length === 0 ||
                    unmappedCount === 0
                  }
                  className="btn"
                  style={{
                    padding: "4px 12px",
                    fontSize: "0.75rem",
                    background:
                      isMapping ||
                      selectedLocCols.length === 0 ||
                      unmappedCount === 0
                        ? "#f3f4f6"
                        : "#000000",
                    color:
                      isMapping ||
                      selectedLocCols.length === 0 ||
                      unmappedCount === 0
                        ? "#6b7280"
                        : "#ffffff",
                    border: "1px solid #d1d5db",
                    borderRadius: "4px",
                    cursor:
                      isMapping ||
                      selectedLocCols.length === 0 ||
                      unmappedCount === 0
                        ? "default"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isMapping ? (
                    <>
                      <span
                        className="spinner"
                        style={{ width: 12, height: 12 }}
                      />{" "}
                      Mapping {mappingProgress}%...
                    </>
                  ) : selectedLocCols.length === 0 ? (
                    <>
                      <Play size={14} /> Start mapping
                    </>
                  ) : unmappedCount === 0 ? (
                    <>Mapped ({allLocs.length})</>
                  ) : (
                    <>
                      <Play size={14} /> Start mapping ({unmappedCount})
                    </>
                  )}
                </button>
                {isMapping && (
                  <div
                    style={{
                      width: "100%",
                      height: "4px",
                      background: "var(--bg-active)",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        background: "#000000",
                        width: `${mappingProgress}%`,
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              Historical Era
            </label>
            <select
              className="input select"
              style={{
                fontSize: "0.8125rem",
                padding: "4px 32px 4px 8px",
                width: "140px",
                border: "1px solid var(--border)",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
              value={era}
              onChange={(e) => setEra(e.target.value as HistoricalEra)}
              id="era-selector"
              aria-label="Select historical era"
            >
              {ERA_ORDER.map((e) => (
                <option key={e} value={e}>
                  {ERA_CONFIGS[e].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                display: "block",
                marginBottom: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
              }}
            >
              Map Style
            </label>
            <select
              className="input select"
              style={{
                fontSize: "0.8125rem",
                padding: "4px 32px 4px 8px",
                width: "140px",
                border: "1px solid var(--border)",
                fontWeight: 500,
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
              value={mapStyle}
              onChange={(e) => setMapStyle(e.target.value as MapStyleKey)}
              id="map-style-selector"
              aria-label="Select map style"
            >
              {Object.entries(MAP_STYLES).map(([k, config]) => (
                <option key={k} value={k}>
                  {config.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          bottom: "1.5rem",
          left: "1rem",
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.95)",
          border: "1px solid var(--border)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow:
            "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
          borderRadius: "var(--radius-lg)",
          padding: "0.75rem 1rem",
          fontSize: "0.7rem",
        }}
      >
        <div
          style={{
            color: "var(--text-primary)",
            marginBottom: "0.5rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
          }}
        >
          Legend
        </div>
        {selectedLocCols.length === 0 && (
          <div style={{ color: "var(--text-muted)" }}>No columns selected</div>
        )}
        {selectedLocCols.map((col, idx) => (
          <div
            key={col}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "3px",
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: COLUMN_COLORS[idx % COLUMN_COLORS.length],
              }}
            />
            <span style={{ color: "var(--text-muted)" }}>{col}</span>
          </div>
        ))}
        {selectedLocCols.length === 2 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "6px",
              marginBottom: "3px",
            }}
          >
            <div
              style={{
                width: 16,
                height: 2,
                background: "rgba(201,168,76,0.5)",
                borderTop: "2px dashed #c9a84c",
              }}
            />
            <span style={{ color: "var(--gold)" }}>Route Connections</span>
          </div>
        )}
        <div
          style={{
            marginTop: "0.5rem",
            color: "var(--text-muted)",
            borderTop: "1px solid var(--border)",
            paddingTop: "0.5rem",
          }}
        >
          Bubble size = frequency
        </div>
      </div>

      {/* Map Content Area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {/* Map Container */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background: "transparent",
          }}
        >
          <MapContainer
            center={[30, 15]}
            zoom={3}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
          >
            <TileLayer
              url={MAP_STYLES[mapStyle].url}
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
            />

            {(markers.length > 0 || isMapping) && (
              <>
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
                          { sticky: true, opacity: 1, className: "" },
                        );
                      }
                    }}
                  />
                )}

                {flowLines.map((line, i) => (
                  <Polyline
                    key={`line-${i}`}
                    positions={[line.start, line.end]}
                    pathOptions={{
                      color: "#c9a84c",
                      weight: Math.min(6, 1.5 + line.count * 0.5),
                      opacity: 0.6,
                    }}
                  >
                    <Popup>
                      <div style={{ fontFamily: "var(--font-sans)", padding: "4px" }}>
                        <strong>{line.startLoc}</strong> ➔ <strong>{line.endLoc}</strong><br/>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block", marginTop: "4px" }}>
                          <strong>{line.count}</strong> connection{line.count > 1 ? 's' : ''} along this route
                        </span>
                      </div>
                    </Popup>
                  </Polyline>
                ))}

                {filteredMarkers.map((m, i) => {
                  const radius = 6 + (m.count / maxCount) * 18;
                  const colorIdx = selectedLocCols.indexOf(m.colName);
                  const color =
                    colorIdx >= 0
                      ? COLUMN_COLORS[colorIdx % COLUMN_COLORS.length]
                      : "#c9a84c";

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
                      eventHandlers={{ click: () => setSelectedMarker(m) }}
                    >
                      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                        <div style={{ fontFamily: "var(--font-sans)" }}>
                          <strong>{m.locationName}</strong>
                          <br />
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            Click to view {m.count} records
                          </span>
                        </div>
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
              </>
            )}
          </MapContainer>

          {markers.length === 0 && !isMapping && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg-card)",
                textAlign: "center",
                zIndex: 1000,
              }}
            >
              <MapIcon
                size={48}
                strokeWidth={1}
                style={{
                  opacity: 0.5,
                  marginBottom: "1rem",
                  color: "var(--text-muted)",
                }}
              />
              <h3
                style={{
                  fontFamily: "var(--font-serif)",
                  margin: 0,
                  color: "var(--text-primary)",
                  marginBottom: "0.5rem",
                }}
              >
                Ready to Map
              </h3>
              <p
                style={{
                  color: "var(--text-muted)",
                  fontSize: "0.875rem",
                  maxWidth: "340px",
                  lineHeight: 1.5,
                }}
              >
                Select a location column from the top panel and click{" "}
                <strong>Map items</strong> to begin geocoding and visualize the
                data.
              </p>
            </div>
          )}
        </div>

        {/* Sidebar for Selected Marker Data */}
        {selectedMarker && (
          <div
            style={{
              width: "400px",
              borderLeft: "1px solid var(--border)",
              background: "var(--bg-surface)",
              display: "flex",
              flexDirection: "column",
              zIndex: 1000,
              boxShadow: "-4px 0 15px rgba(0,0,0,0.05)",
            }}
          >
            {/* Sidebar Header */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "1.125rem",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                }}
              >
                {selectedMarker.locationName}
              </h3>
              <button
                onClick={() => setSelectedMarker(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--text-muted)",
                  display: "flex",
                  padding: "4px",
                  borderRadius: "4px",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--bg-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <X size={18} />
              </button>
            </div>

            {/* Sidebar Stats */}
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border)",
                fontSize: "0.8125rem",
                color: "var(--text-muted)",
                background: "var(--bg-main)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-muted)" }}>
                <Database size={14} style={{ color: "var(--primary)" }} />
                <span style={{ fontWeight: 500, color: "var(--text-primary)" }}>
                  {selectedMarker.count} records
                </span>
              </div>
            </div>

            {/* Data Rows as Table */}
            <div style={{ flex: 1, overflow: "auto", background: "var(--bg-surface)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem", whiteSpace: "nowrap" }}>
                <thead style={{ position: "sticky", top: 0, background: "var(--bg-main)", zIndex: 10, boxShadow: "0 1px 0 var(--border)" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-secondary)", textAlign: "left" }}>#</th>
                    {Array.from(new Set(selectedMarker.rows.flatMap(r => Object.keys(r)))).map(k => (
                      <th key={k} style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", fontWeight: 600, color: "var(--text-secondary)", textAlign: "left" }}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedMarker.rows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                      <td style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", color: "var(--text-muted)", fontWeight: 500 }}>{i + 1}</td>
                      {Array.from(new Set(selectedMarker.rows.flatMap(r => Object.keys(r)))).map(k => (
                        <td key={k} style={{ padding: "8px 12px", borderRight: "1px solid var(--border)", color: "var(--text-primary)" }}>
                          {row[k] ? row[k] : <span style={{color: "var(--text-muted)", opacity: 0.5}}>-</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
