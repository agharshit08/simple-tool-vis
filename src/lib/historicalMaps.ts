export type HistoricalEra = 'modern' | '1800s' | '1700s' | '1600s' | 'pre1600';

export interface EraConfig {
  label: string;
  yearRange: [number, number];
  tileUrl: string;
  tileAttribution: string;
  geojsonUrl: string | null;
  opacity: number;
}

export const ERA_CONFIGS: Record<HistoricalEra, EraConfig> = {
  modern: {
    label: 'Modern (2000s)',
    yearRange: [1900, 2100],
    tileUrl: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    geojsonUrl: null,
    opacity: 1,
  },
  '1800s': {
    label: '19th Century (1800s)',
    yearRange: [1800, 1899],
    tileUrl: 'https://stamen-tiles-{s}.a.ssl.fastly.net/toner/{z}/{x}/{y}{r}.png',
    tileAttribution: 'Map tiles by <a href="http://stamen.com">Stamen Design</a>',
    geojsonUrl: 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1880.geojson',
    opacity: 0.85,
  },
  '1700s': {
    label: '18th Century (1700s)',
    yearRange: [1700, 1799],
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    geojsonUrl: 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1800.geojson',
    opacity: 0.8,
  },
  '1600s': {
    label: '17th Century (1600s)',
    yearRange: [1600, 1699],
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    geojsonUrl: 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1700.geojson',
    opacity: 0.75,
  },
  pre1600: {
    label: 'Pre-1600 (Medieval)',
    yearRange: [0, 1599],
    tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    tileAttribution: '&copy; <a href="https://carto.com/">CartoDB</a>',
    geojsonUrl: 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1500.geojson',
    opacity: 0.7,
  },
};

export function getEraForYear(year: number): HistoricalEra {
  if (year >= 1900) return 'modern';
  if (year >= 1800) return '1800s';
  if (year >= 1700) return '1700s';
  if (year >= 1600) return '1600s';
  return 'pre1600';
}

export const ERA_ORDER: HistoricalEra[] = ['modern', '1800s', '1700s', '1600s', 'pre1600'];
