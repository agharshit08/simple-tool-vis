import { getGenerativeModel } from 'firebase/ai';
import { ai } from './firebase';
import type { ParsedDataset } from './csvParser';

export interface DataInsight {
  summary: string;
  keyFindings: string[];
  patterns: string[];
  suggestions: string[];
  chartRecommendations: { type: string; columns: string[]; reason: string }[];
  networkRecommendations?: { relationships: { source: string; target: string }[]; reason: string }[];
}

export interface QAResponse {
  answer: string;
  confidence: 'high' | 'medium' | 'low';
  followUp?: string;
}

function buildDataContext(dataset: ParsedDataset): string {
  const colSummary = dataset.columns.map(c =>
    `"${c.name}" (type: ${c.type}, samples: ${c.sample.slice(0, 3).join(', ')})`
  ).join('\n');
  const sampleRows = dataset.rows.slice(0, 10);
  let ctxStr = `Dataset: "${dataset.filename}" — ${dataset.rowCount} records\n`;
  if (dataset.researchContext) {
    ctxStr += `\nResearch Context / Goals provided by user:\n"${dataset.researchContext}"\n\n`;
  }
  ctxStr += `Columns:\n${colSummary}\nSample rows (first 10):\n${JSON.stringify(sampleRows, null, 2)}`;
  return ctxStr;
}

export async function generateInsights(dataset: ParsedDataset): Promise<DataInsight> {
  const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
  const context = buildDataContext(dataset);

  const prompt = `You are an expert data analyst and researcher.
Analyze this dataset and provide insights, tailored to the user's research context if provided.

${context}

Respond ONLY with valid JSON, no markdown fences:
{
  "summary": "2-3 sentence overview of what this dataset contains and its historical significance",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "patterns": ["pattern or trend observed 1", "pattern 2"],
  "suggestions": ["research question this data could answer 1", "suggestion 2"],
  "chartRecommendations": [
    {"type": "bar|line|scatter|map", "columns": ["col1", "col2"], "reason": "why this chart fits"}
  ],
  "networkRecommendations": [
    {
      "relationships": [
        {"source": "ColumnA", "target": "ColumnB"},
        {"source": "ColumnB", "target": "ColumnC"}
      ],
      "reason": "Why exploring this multi-node relationship chain is interesting"
    }
  ]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as DataInsight;
}

export async function askQuestion(dataset: ParsedDataset, question: string): Promise<QAResponse> {
  const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
  const context = buildDataContext(dataset);

  const prompt = `You are a data analysis AI assistant. A researcher is asking about their dataset.

${context}

Researcher's question: "${question}"

Analyze the data carefully and answer the question. If exact numbers are needed, compute from the sample rows.
Respond ONLY with valid JSON:
{
  "answer": "detailed answer to the question, referencing specific data points",
  "confidence": "high|medium|low",
  "followUp": "optional: a related question the researcher might want to explore"
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as QAResponse;
}

export async function detectAnomalies(dataset: ParsedDataset): Promise<string[]> {
  const model = getGenerativeModel(ai, { model: 'gemini-2.0-flash' });
  const context = buildDataContext(dataset);

  const prompt = `You are an expert data analyst. Identify any anomalies, outliers, or interesting patterns in this dataset, keeping any provided research context in mind.
${context}

Respond ONLY with a JSON array of strings (max 5 items):
["anomaly or interesting observation 1", "anomaly 2"]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as string[];
}
