import Papa from 'papaparse';
import { read, utils } from 'xlsx';
import { ai } from './firebase';
import { getTemplateGenerativeModel } from 'firebase/ai';

export type ColumnType = 'date' | 'year' | 'location' | 'latitude' | 'longitude' | 'entity' | 'number' | 'boolean' | 'category' | 'text' | 'relationship';

export interface ColumnInfo {
  name: string;
  type: ColumnType;
  confidence: number;
  sample: string[];
  detectionSource?: 'heuristic' | 'ai' | 'fallback';
}

export interface ParsedDataset {
  columns: ColumnInfo[];
  rows: Record<string, string>[];
  rowCount: number;
  filename: string;
  researchContext?: string;
  insights?: any;
  isInsightsGenerated?: boolean;
  networkRecommendations?: { relationships: { source: string; target: string }[]; reason: string }[];
}

export interface SuggestedInsight {
  title: string;
  description: string;
  xCol: string;
  yCol: string;
  chartType: 'Bar' | 'Line' | 'Scatter';
  aggregation: 'average' | 'sum' | 'count';
}

// Heuristic pre-detection before sending to AI
function heuristicDetect(name: string, samples: string[]): ColumnType | null {
  const lower = name.toLowerCase();
  const nonEmpty = samples.filter(Boolean);

  if (/\b(lat|latitude)\b/.test(lower)) return 'latitude';
  if (/\b(lon|lng|longitude)\b/.test(lower)) return 'longitude';

  // Year: column name contains year/yr AND values are 3-4 digit numbers
  if (/\b(year|yr|born|birth_year|death_year|founded|established|period)\b/.test(lower)
    && nonEmpty.some(v => /^-?\d{3,4}$/.test(v.trim()))) return 'year';

  if (/\b(date|died|death_date|birth_date)\b/.test(lower)) return 'date';

  // Location: broad patterns covering geographic and spatial column names
  if (/\b(city|town|place|location|origin|destination|site|region|country|nation|birth_city|death_city|origin_city|destination_city|capital|port|settlement|colony|province|state|county|address|zip|postal|district)\b/.test(lower)) return 'location';

  // Entity: generic nodes (people, companies, products, subjects)
  if (/\b(name|person|individual|scholar|merchant|author|subject|ruler|king|queen|philosopher|scientist|artist|figure|actor|agent|who|character|member|company|organization|institution|product|client|customer|patient|employee)\b/.test(lower)) return 'entity';

  // Relationship: columns describing connections between entities
  if (/\b(known_to|knows|mentor|mentored_by|student|teacher|colleague|relationship|connection|associate|collaborator|network|linked_to|connected_to|influenced|institution|university|academy|school|college|employer)\b/.test(lower)) return 'relationship';

  // Boolean: check if values are strictly boolean-like
  if (nonEmpty.length > 0) {
    const boolValues = new Set(['yes', 'no', 'true', 'false', 'y', 'n', 't', 'f', '1', '0']);
    if (nonEmpty.every(v => boolValues.has(v.trim().toLowerCase()))) return 'boolean';
  }

  if (nonEmpty.length > 0 && nonEmpty.every(v => !isNaN(Number(v.trim())))) return 'number';
  return null;
}



export async function getSheetNames(file: File): Promise<string[]> {
  if (!file.name.endsWith('.xlsx')) return [];
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: 'array' });
  return workbook.SheetNames;
}

export async function parseFileBasic(file: File, context?: string, sheetName?: string, onProgress?: (msg: string, percent?: number) => void): Promise<ParsedDataset> {
  let rows: Record<string, string>[] = [];
  let headers: string[] = [];
  if (onProgress) onProgress('Reading file...', 10);

  if (file.name.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    const workbook = read(buffer, { type: 'array' });
    const targetSheetName = sheetName || workbook.SheetNames[0];
    const worksheet = workbook.Sheets[targetSheetName];
    const dataArray = utils.sheet_to_json<any[]>(worksheet, { header: 1 });
    
    let headerRowIndex = 0;
    let maxCols = 0;
    for (let i = 0; i < Math.min(10, dataArray.length); i++) {
      const row = dataArray[i] || [];
      const validCols = row.filter(cell => typeof cell === 'string' && cell.trim() !== '').length;
      if (validCols > maxCols) {
        maxCols = validCols;
        headerRowIndex = i;
      }
    }

    if (dataArray.length > headerRowIndex) {
      headers = (dataArray[headerRowIndex] as string[]).map(String);
      const rawRows = utils.sheet_to_json<Record<string, any>>(worksheet, { range: headerRowIndex });
      rows = rawRows.map(row => {
        const strRow: Record<string, string> = {};
        for (const key of headers) {
          strRow[key] = row[key] !== undefined && row[key] !== null ? String(row[key]) : '';
        }
        return strRow;
      });
    }
  } else {
    const parsed = await new Promise<Papa.ParseResult<unknown>>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: resolve,
        error: reject,
      });
    });
    rows = parsed.data as Record<string, string>[];
    headers = parsed.meta.fields || [];
  }

  if (onProgress) onProgress('Applying basic heuristics...', 50);
  const columnInfos: ColumnInfo[] = [];

  for (const header of headers) {
    const samples = Array.from(new Set(rows.map(r => r[header]).filter(Boolean))).slice(0, 5);
    const heuristicType = heuristicDetect(header, samples) || 'text';
    columnInfos.push({
      name: header,
      type: heuristicType,
      confidence: 0.85,
      sample: samples,
      detectionSource: 'heuristic'
    });
  }

  if (onProgress) onProgress('Done!', 100);
  return {
    columns: columnInfos,
    rows,
    rowCount: rows.length,
    filename: file.name,
    researchContext: context
  };
}

export async function detectColumnsAI(dataset: ParsedDataset): Promise<ParsedDataset> {
  if (!ai || dataset.columns.length === 0) return dataset;

  const allColumns = dataset.columns.map(c => ({ name: c.name, samples: c.sample }));
  const validTypes = ['date', 'year', 'location', 'latitude', 'longitude', 'entity', 'number', 'boolean', 'category', 'text', 'relationship'];
  let parsedTypes: Record<string, string> = {};
  let aiInsights: any;
  let networkRecs: any[] | undefined;

  try {
    const model = getTemplateGenerativeModel(ai);
    const result = await model.generateContent('batch-column-detection', {
      columnsData: JSON.stringify(allColumns)
    });
    const responseText = result.response.text();
    const rawJson = JSON.parse(responseText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim());
    
    if (rawJson.columnTypes) {
      parsedTypes = rawJson.columnTypes;
      aiInsights = {
        summary: rawJson.summary || '',
        keyFindings: rawJson.keyFindings || [],
        patterns: rawJson.patterns || [],
        suggestions: rawJson.suggestions || [],
        chartRecommendations: rawJson.insights || rawJson.chartRecommendations || [],
        networkRecommendations: rawJson.networkRecommendations || []
      } as any;
      networkRecs = rawJson.networkRecommendations;
    } else {
      parsedTypes = rawJson;
    }
  } catch (err) {
    console.error('AI classification failed', err);
    return dataset; // Return original heuristic dataset if AI fails
  }

  const newColumnInfos: ColumnInfo[] = dataset.columns.map(col => {
    let finalType = col.type;
    let source = col.detectionSource;
    let confidence = col.confidence;

    const aiTypeRaw = parsedTypes[col.name];
    if (aiTypeRaw) {
      const aiType = aiTypeRaw.toLowerCase().trim();
      if (validTypes.includes(aiType)) {
        finalType = aiType as ColumnType;
        source = 'ai';
        confidence = 0.8;
      }
    }

    return {
      ...col,
      type: finalType,
      detectionSource: source,
      confidence
    };
  });

  const enrichedDataset: ParsedDataset = {
    ...dataset,
    columns: newColumnInfos,
    networkRecommendations: networkRecs
  };

  if (aiInsights) {
    if (!aiInsights.chartRecommendations || aiInsights.chartRecommendations.length === 0) {
      const heuristics = generateInsightsHeuristics(enrichedDataset);
      aiInsights.chartRecommendations = heuristics.chartRecommendations;
      if (!aiInsights.summary) aiInsights.summary = heuristics.summary;
      if (!aiInsights.keyFindings || aiInsights.keyFindings.length === 0) aiInsights.keyFindings = heuristics.keyFindings;
      if (!aiInsights.suggestions || aiInsights.suggestions.length === 0) aiInsights.suggestions = heuristics.suggestions;
    }
    enrichedDataset.insights = aiInsights;
  } else {
    enrichedDataset.insights = generateInsightsHeuristics(enrichedDataset);
  }

  return enrichedDataset;
}

export function generateInsightsHeuristics(dataset: ParsedDataset): any {
  const insights: SuggestedInsight[] = [];
  const { columns } = dataset;
  
  const categories = columns.filter(c => ['category', 'entity', 'location', 'boolean'].includes(c.type));
  const numbers = columns.filter(c => c.type === 'number');
  const years = columns.filter(c => c.type === 'year' || c.type === 'date');

  if (years.length > 0 && numbers.length > 0) {
    insights.push({
      title: `Average ${numbers[0].name} over Time`,
      description: `Track how ${numbers[0].name} changes across different ${years[0].name}s.`,
      xCol: years[0].name,
      yCol: numbers[0].name,
      chartType: 'Line',
      aggregation: 'average'
    });
  }

  if (categories.length > 0 && numbers.length > 0) {
    const numToUse = numbers.length > 1 ? numbers[1] : numbers[0];
    insights.push({
      title: `Total ${numToUse.name} by ${categories[0].name}`,
      description: `Compare the total sum of ${numToUse.name} across each ${categories[0].name}.`,
      xCol: categories[0].name,
      yCol: numToUse.name,
      chartType: 'Bar',
      aggregation: 'sum'
    });
  }

  if (categories.length >= 2) {
    insights.push({
      title: `Distribution of ${categories[0].name} by ${categories[1].name}`,
      description: `Analyze the makeup of ${categories[0].name} within each ${categories[1].name}.`,
      xCol: categories[1].name,
      yCol: categories[0].name,
      chartType: 'Bar',
      aggregation: 'count'
    });
  } else if (categories.length === 1 && numbers.length === 0) {
    insights.push({
      title: `Distribution of ${categories[0].name}`,
      description: `See how many records exist for each ${categories[0].name}.`,
      xCol: categories[0].name,
      yCol: categories[0].name,
      chartType: 'Bar',
      aggregation: 'count'
    });
  }

  if (numbers.length > 1) {
    insights.push({
      title: `Correlation: ${numbers[0].name} vs ${numbers[1].name}`,
      description: `Analyze the relationship between ${numbers[0].name} and ${numbers[1].name}.`,
      xCol: numbers[0].name,
      yCol: numbers[1].name,
      chartType: 'Scatter',
      aggregation: 'average'
    });
  }

  const fallbackChartRecs = insights.slice(0, 3).map(i => ({
    type: i.chartType.toLowerCase(),
    columns: [i.xCol, i.yCol],
    reason: i.description,
    aggregation: i.aggregation
  }));

  return {
    summary: 'Fallback insights generated using heuristics because AI classification was skipped or failed.',
    keyFindings: insights.slice(0, 3).map(i => i.title),
    patterns: [],
    suggestions: insights.slice(0, 3).map(i => i.description),
    chartRecommendations: fallbackChartRecs,
    networkRecommendations: []
  };
}
