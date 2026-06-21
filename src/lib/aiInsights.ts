import { ai } from './firebase';
import { getGenerativeModel, getTemplateGenerativeModel } from 'firebase/ai';
import type { ParsedDataset } from './csvParser';
import { AI_CONFIG } from './constants';

export interface DataInsight {
  summary: string;
  keyFindings: string[];
  patterns: string[];
  anomalies: string[];
  suggestedQuestions: string[];
  chartRecommendations: { type: string; columns: string[]; reason: string }[];
  networkRecommendations: { relationships: { source: string; target: string }[]; reason: string }[];
  researchHypothesis: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  media?: string; // Base64 data URL for UI rendering
}

export interface DataChat {
  sendMessage(question: string, fileData?: { dataUrl: string; base64: string; mimeType: string }): Promise<string>;
  getHistory(): ChatMessage[];
  reset(): void;
}

export function buildCompactDataContext(dataset: ParsedDataset): string {
  const lines: string[] = [];

  lines.push(`File: ${dataset.filename}`);
  lines.push(`Rows: ${dataset.rowCount}`);
  if (dataset.researchContext) {
    lines.push(`Context: ${dataset.researchContext}`);
  }

  lines.push('');
  lines.push('Columns: ' + dataset.columns.map(c => `${c.name}(${c.type})`).join(', '));

  const nonEmptyCols = dataset.columns.filter(col => {
    const filled = dataset.rows.filter(r => r[col.name]?.trim()).length;
    return filled / dataset.rowCount > 0.2;
  });

  const colNames = nonEmptyCols.map(c => c.name);
  lines.push('');
  lines.push(colNames.join('|'));

  const MAX_ROWS = AI_CONFIG.MAX_CONTEXT_ROWS;
  let sampledRows = dataset.rows;
  
  if (dataset.rows.length > MAX_ROWS) {
    const step = dataset.rows.length / MAX_ROWS;
    sampledRows = [];
    for (let i = 0; i < MAX_ROWS; i++) {
      sampledRows.push(dataset.rows[Math.floor(i * step)]);
    }
  }

  for (let i = 0; i < sampledRows.length; i++) {
    const row = sampledRows[i];
    const vals = colNames.map(name => {
      const v = row[name] ?? '';
      return v.length > 50 ? v.slice(0, 50) + '…' : v;
    });
    lines.push(vals.join('|'));
  }

  return lines.join('\n');
}

export async function generateInsights(dataset: ParsedDataset): Promise<DataInsight> {
  const model = getTemplateGenerativeModel(ai);
  const dataContext = buildCompactDataContext(dataset);

  const result = await model.generateContent('dataset-insights', {
    dataContext,
  });

  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text) as DataInsight;
}

export function createDataChat(dataset: ParsedDataset): DataChat {
  const model = getGenerativeModel(ai, {
    model: 'gemini-3.5-flash',
    systemInstruction: `You are an expert data analyst and domain specialist. You will be provided with context about a dataset, including columns and sample rows. Answer the user's questions by deeply analyzing the provided data, and feel free to draw upon your broader worldly knowledge to explain underlying context or factors (such as historical or institutional reasons) when the data alone doesn't tell the full story. Deliver high-value, insightful responses in a highly digestible manner. Use clear spacing, bold text, or bullet points to make the information easy to scan. Be comprehensive but concise—avoid overly dense text or unnecessary conversational filler.`,
  });

  const dataContext = buildCompactDataContext(dataset);
  const seedUser = `Here is the dataset I want to discuss:\n\n${dataContext}`;
  const seedModel = `I have analyzed your dataset "${dataset.filename}" with ${dataset.rowCount} rows and ${dataset.columns.length} columns. Ask me anything about it.`;

  const baseHistory = [
    { role: 'user' as const, parts: [{ text: seedUser }] },
    { role: 'model' as const, parts: [{ text: seedModel }] },
  ];

  let chat = model.startChat({ history: [...baseHistory] });
  let messages: ChatMessage[] = [];

  return {
    async sendMessage(question: string, fileData?: { dataUrl: string; base64: string; mimeType: string }): Promise<string> {
      messages.push({ role: 'user', text: question, media: fileData?.dataUrl });
      
      let payload: string | Array<string | any> = question;
      if (fileData) {
        payload = [
          question,
          { inlineData: { data: fileData.base64, mimeType: fileData.mimeType } }
        ];
      }

      const result = await chat.sendMessage(payload);
      const reply = result.response.text();
      messages.push({ role: 'model', text: reply });
      return reply;
    },

    getHistory(): ChatMessage[] {
      return [...messages];
    },

    reset(): void {
      chat = model.startChat({ history: [...baseHistory] });
      messages = [];
    },
  };
}
