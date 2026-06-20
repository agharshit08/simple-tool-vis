'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useRef, useCallback } from 'react';
import type { ParsedDataset, SuggestedInsight } from '@/lib/csvParser';
import type { DataInsight, DataChat, ChatMessage } from '@/lib/aiInsights';
import type { GeoResult } from '@/lib/geocoder';

interface DatasetContextType {
  dataset: ParsedDataset | null;
  setDataset: (d: ParsedDataset | null | ((prev: ParsedDataset | null) => ParsedDataset | null)) => void;
  yearRange: [number, number];
  setYearRange: (r: [number, number]) => void;
  selectedYear: number | null;
  setSelectedYear: (y: number | null) => void;
  researchContext: string;
  setResearchContext: (ctx: string) => void;
  isAnalyzingColumns: boolean;
  setAnalyzingColumns: (isAnalyzing: boolean) => void;
  hiddenColumns: string[];
  setHiddenColumns: (cols: string[]) => void;
  suggestedInsights: SuggestedInsight[];
  setSuggestedInsights: (insights: SuggestedInsight[]) => void;
  globalDataInsights: DataInsight | null;
  isGeneratingGlobalInsights: boolean;
  deleteRow: (row: Record<string, string>) => void;
  
  // Mapping State
  geocodedLocations: Record<string, GeoResult>;
  setGeocodedLocations: (locs: Record<string, GeoResult> | ((prev: Record<string, GeoResult>) => Record<string, GeoResult>)) => void;
  isMapping: boolean;
  setIsMapping: (m: boolean) => void;
  mappingProgress: number;
  setMappingProgress: (p: number) => void;
  mappingAbortController: AbortController | null;
  setMappingAbortController: (ac: AbortController | null) => void;
  
  // Chat State
  chatMessages: ChatMessage[];
  setChatMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  chatInstance: DataChat | null;
  setChatInstance: (chat: DataChat | null) => void;
}

const DatasetContext = createContext<DatasetContextType>({
  dataset: null,
  setDataset: () => {},
  yearRange: [1400, 2000],
  setYearRange: () => {},
  selectedYear: null,
  setSelectedYear: () => {},
  researchContext: '',
  setResearchContext: () => {},
  isAnalyzingColumns: false,
  setAnalyzingColumns: () => {},
  hiddenColumns: [],
  setHiddenColumns: () => {},
  suggestedInsights: [],
  setSuggestedInsights: () => {},
  globalDataInsights: null,
  isGeneratingGlobalInsights: false,
  deleteRow: () => {},
  geocodedLocations: {},
  setGeocodedLocations: () => {},
  isMapping: false,
  setIsMapping: () => {},
  mappingProgress: 0,
  setMappingProgress: () => {},
  mappingAbortController: null,
  setMappingAbortController: () => {},
  chatMessages: [],
  setChatMessages: () => {},
  chatInstance: null,
  setChatInstance: () => {},
});

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [dataset, setDatasetState] = useState<ParsedDataset | null>(null);
  const [yearRange, setYearRange] = useState<[number, number]>([1400, 2000]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [researchContext, setResearchContext] = useState<string>('');
  const [isAnalyzingColumns, setAnalyzingColumns] = useState<boolean>(false);
  const [hiddenColumns, setHiddenColumns] = useState<string[]>([]);
  
  // Mapping State
  const [geocodedLocations, setGeocodedLocations] = useState<Record<string, GeoResult>>({});
  const [isMapping, setIsMapping] = useState(false);
  const [mappingProgress, setMappingProgress] = useState(0);
  const [mappingAbortController, setMappingAbortController] = useState<AbortController | null>(null);

  // Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInstance, setChatInstance] = useState<DataChat | null>(null);

  // Wrap setDataset to cancel mapping if the dataset changes entirely
  const setDataset = useCallback((action: ParsedDataset | null | ((prev: ParsedDataset | null) => ParsedDataset | null)) => {
    setDatasetState((prev) => {
      const newDataset = typeof action === 'function' ? action(prev) : action;
      // If we are setting a completely new dataset (not just updating rows/insights)
      if (prev && newDataset && prev.filename !== newDataset.filename) {
        if (mappingAbortController) mappingAbortController.abort();
        setGeocodedLocations({});
        setIsMapping(false);
        setMappingProgress(0);
        setChatMessages([]);
        setChatInstance(null);
      }
      return newDataset;
    });
  }, [mappingAbortController]);

  const globalDataInsights = useMemo(() => {
    if (!dataset || !dataset.insights) return null;
    return {
      ...(dataset.insights as any),
      networkRecommendations: dataset.networkRecommendations
    } as DataInsight;
  }, [dataset]);

  const suggestedInsights = useMemo(() => {
    if (!dataset || !dataset.insights) return [];
    
    return (dataset.insights.chartRecommendations || []).map((rec: any) => ({
      title: rec.title || dataset.insights.title || 'Chart Suggestion',
      description: rec.description || rec.reason || '',
      xCol: rec.xCol || rec.columns?.[0] || '',
      yCol: rec.yCol || rec.columns?.[1] || '',
      chartType: rec.chartType || (rec.type ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1) : 'Bar'),
      aggregation: rec.aggregation || 'sum'
    })) as SuggestedInsight[];
  }, [dataset]);

  const isGeneratingGlobalInsights = isAnalyzingColumns;

  const deleteRow = (rowToDelete: Record<string, string>) => {
    if (!dataset) return;
    const newRows = dataset.rows.filter(r => r !== rowToDelete);
    setDatasetState({ ...dataset, rows: newRows, rowCount: newRows.length });
  };

  return (
    <DatasetContext.Provider value={{ 
      dataset, setDataset, 
      yearRange, setYearRange, 
      selectedYear, setSelectedYear, 
      researchContext, setResearchContext,
      isAnalyzingColumns, setAnalyzingColumns,
      hiddenColumns, setHiddenColumns,
      suggestedInsights, setSuggestedInsights: () => {},
      globalDataInsights, isGeneratingGlobalInsights,
      deleteRow,
      geocodedLocations, setGeocodedLocations,
      isMapping, setIsMapping,
      mappingProgress, setMappingProgress,
      mappingAbortController, setMappingAbortController,
      chatMessages, setChatMessages,
      chatInstance, setChatInstance
    }}>
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  return useContext(DatasetContext);
}

export default DatasetContext;
