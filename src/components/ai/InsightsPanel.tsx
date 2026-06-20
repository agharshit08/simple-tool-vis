'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createDataChat, generateInsights, type DataInsight, type DataChat, type ChatMessage } from '@/lib/aiInsights';
import type { ParsedDataset } from '@/lib/csvParser';
import {
  Bot, ClipboardList, MessageSquare, AlertTriangle, ArrowUp,
  Lightbulb, TrendingUp, BarChart3, Network, MapPin, RotateCcw,
  Sparkles, Paperclip, X
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useDataset } from '@/context/DatasetContext';

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

const tabStyle = (active: boolean) => ({
  flex: 1,
  padding: '0.625rem',
  background: 'none',
  border: 'none',
  borderBottom: active ? '2px solid var(--gold)' : '2px solid transparent',
  color: active ? 'var(--gold)' : 'var(--text-muted)',
  fontSize: '0.75rem',
  fontWeight: active ? 600 : 400,
  cursor: 'pointer',
  transition: 'all 0.15s',
  fontFamily: 'var(--font-sans)',
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: '0.375rem',
});

const sectionTitle = {
  fontFamily: 'var(--font-mono)',
  fontSize: '0.65rem',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginBottom: '0.625rem',
  marginTop: '1rem',
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '0.375rem',
};

function badgeColor(type: string) {
  if (!type) return 'var(--text-muted)';
  switch (type.toLowerCase()) {
    case 'bar': return 'var(--gold)';
    case 'line': return 'var(--teal)';
    case 'scatter': return 'var(--crimson-bright)';
    case 'map': return 'var(--teal)';
    case 'network': return 'var(--crimson-bright)';
    default: return 'var(--text-muted)';
  }
}

// ─── Summary Tab ────────────────────────────────────────────────────

function SummaryTab({ insights, onAskQuestion }: { insights: DataInsight; onAskQuestion: (q: string) => void }) {
  return (
    <div style={{ padding: '1rem' }}>
      {/* Summary */}
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '1rem' }}>
        &ldquo;{insights.summary}&rdquo;
      </p>

      {/* Key Findings */}
      <h4 style={sectionTitle}><BarChart3 size={12} /> Key Findings</h4>
      {insights.keyFindings?.map((f, i) => (
        <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', marginTop: 6, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', lineHeight: 1.5 }}>{f}</span>
        </div>
      ))}

      {/* Patterns */}
      {insights.patterns?.length > 0 && (
        <>
          <h4 style={sectionTitle}><TrendingUp size={12} /> Patterns</h4>
          {insights.patterns.map((p, i) => (
            <div key={i} style={{
              padding: '0.5rem 0.75rem', marginBottom: '0.375rem',
              background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)', fontSize: '0.8rem',
              color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>{p}</div>
          ))}
        </>
      )}

      {/* Anomalies */}
      {insights.anomalies?.length > 0 && (
        <>
          <h4 style={sectionTitle}><AlertTriangle size={12} color="var(--gold)" /> Anomalies</h4>
          {insights.anomalies.map((a, i) => (
            <div key={i} style={{
              padding: '0.5rem 0.75rem', marginBottom: '0.375rem',
              background: 'rgba(255, 193, 7, 0.06)', borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255, 193, 7, 0.2)', fontSize: '0.8rem',
              color: 'var(--text-secondary)', lineHeight: 1.5,
            }}>{a}</div>
          ))}
        </>
      )}

      {/* Research Hypothesis */}
      {insights.researchHypothesis && (
        <>
          <h4 style={sectionTitle}><Lightbulb size={12} color="var(--gold)" /> Research Hypothesis</h4>
          <div style={{
            padding: '0.75rem', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(255,193,7,0.08), rgba(255,193,7,0.02))',
            border: '1px solid rgba(255, 193, 7, 0.25)',
            fontSize: '0.8125rem', color: 'var(--text-primary)',
            lineHeight: 1.6, fontStyle: 'italic',
          }}>
            {insights.researchHypothesis}
          </div>
        </>
      )}

      {/* Chart Recommendations */}
      {insights.chartRecommendations?.length > 0 && (
        <>
          <h4 style={sectionTitle}><BarChart3 size={12} /> Chart Suggestions</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.25rem' }}>
            {insights.chartRecommendations.map((rec, i) => (
              <div key={i} style={{
                padding: '0.375rem 0.625rem', borderRadius: '999px',
                background: 'var(--bg-main)', border: `1px solid ${badgeColor(rec.type)}`,
                fontSize: '0.7rem', color: badgeColor(rec.type),
                cursor: 'default', display: 'flex', alignItems: 'center', gap: '0.25rem',
              }}>
                <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{rec.type}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>
                  {rec.columns?.join(' × ')}
                </span>
              </div>
            ))}
          </div>
          {insights.chartRecommendations.map((rec, i) => (
            <div key={`reason-${i}`} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', paddingLeft: '0.25rem' }}>
              • {rec.reason}
            </div>
          ))}
        </>
      )}

      {/* Network Recommendations */}
      {insights.networkRecommendations?.length > 0 && (
        <>
          <h4 style={sectionTitle}><Network size={12} /> Network Suggestions</h4>
          {insights.networkRecommendations.map((rec, i) => (
            <div key={i} style={{
              padding: '0.5rem 0.75rem', marginBottom: '0.375rem',
              background: 'var(--bg-main)', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.25rem' }}>
                {rec.relationships?.map((r, j) => (
                  <span key={j} style={{ fontSize: '0.7rem', color: 'var(--crimson-bright)' }}>
                    {r.source} → {r.target}{j < rec.relationships.length - 1 ? ',' : ''}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{rec.reason}</div>
            </div>
          ))}
        </>
      )}

      {/* Suggested Questions */}
      {insights.suggestedQuestions?.length > 0 && (
        <>
          <h4 style={sectionTitle}><MessageSquare size={12} /> Ask Your Data</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
            {insights.suggestedQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => onAskQuestion(q)}
                style={{
                  padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-main)', border: '1px solid var(--border)',
                  fontSize: '0.75rem', color: 'var(--gold)',
                  cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'rgba(255,193,7,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-main)'; }}
              >
                → {q}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Ask Data Tab ───────────────────────────────────────────────────

function AskDataTab({ dataset, suggestedQuestions, initialQuestion }: {
  dataset: ParsedDataset;
  suggestedQuestions: string[];
  initialQuestion: string | null;
}) {
  const chatRef = useRef<DataChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const datasetIdRef = useRef(dataset.filename + dataset.rowCount);
  const [selectedFile, setSelectedFile] = useState<{ file: File; dataUrl: string; base64: string; mimeType: string } | null>(null);

  // Init or reset chat when dataset changes
  useEffect(() => {
    const id = dataset.filename + dataset.rowCount;
    if (datasetIdRef.current !== id || !chatRef.current) {
      datasetIdRef.current = id;
      chatRef.current = createDataChat(dataset);
      setMessages([]);
    }
  }, [dataset]);

  // Handle initial question from Summary tab
  useEffect(() => {
    if (initialQuestion && chatRef.current) {
      setInput('');
      handleSend(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setSelectedFile({ file, dataUrl, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = useCallback(async (text?: string) => {
    const question = (text || input).trim();
    if ((!question && !selectedFile) || !chatRef.current || loading) return;
    
    const fileDataToSend = selectedFile;
    
    setInput('');
    setSelectedFile(null);
    setLoading(true);
    
    // Optimistic UI update for the user's message
    setMessages(prev => [...prev, { role: 'user', text: question, media: fileDataToSend?.dataUrl }]);
    
    try {
      const reply = await chatRef.current.sendMessage(question, fileDataToSend || undefined);
      // Sync local state with chat history which now contains both the user message and model reply
      setMessages(chatRef.current.getHistory());
    } catch {
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, selectedFile]);

  const handleReset = () => {
    if (!chatRef.current) return;
    chatRef.current.reset();
    setMessages([]);
    setInput('');
  };

  const noMessages = messages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Chat header with reset */}
      <div style={{ padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {messages.filter(m => m.role === 'user').length} messages
        </span>
        <button
          onClick={handleReset}
          title="Reset conversation"
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '0.25rem', borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.65rem',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Suggested questions when empty */}
        {noMessages && suggestedQuestions.length > 0 && (
          <div style={{ padding: '0.5rem 0' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.75rem', fontFamily: 'var(--font-sans)' }}>
              Try asking:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  style={{
                    padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-main)', border: '1px solid var(--border)',
                    fontSize: '0.75rem', color: 'var(--gold)', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'var(--font-sans)', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  → {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {noMessages && suggestedQuestions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
            <Bot size={24} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <p>Ask anything about your dataset.</p>
          </div>
        )}

        {/* Chat bubbles */}
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '85%',
              padding: '0.625rem 0.875rem',
              borderRadius: msg.role === 'user'
                ? '12px 12px 2px 12px'
                : '12px 12px 12px 2px',
              background: msg.role === 'user'
                ? 'var(--gold)'
                : 'var(--bg-surface)',
              color: msg.role === 'user'
                ? '#ffffff'
                : 'var(--text-primary)',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              border: msg.role === 'model' ? '1px solid var(--border)' : 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              {msg.media && (
                <img src={msg.media} alt="Attached" style={{ maxWidth: '100%', borderRadius: '4px', marginBottom: '0.5rem', maxHeight: '200px', objectFit: 'contain' }} />
              )}
              <div style={{ '& p:first-child': { marginTop: 0 }, '& p:last-child': { marginBottom: 0 } } as any}>
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '12px 12px 12px 2px',
              background: 'var(--bg-main)', border: '1px solid var(--border)',
              display: 'flex', gap: '0.25rem', alignItems: 'center',
            }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)',
                  animation: `dotPulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                }} />
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '0.75rem 1rem', borderTop: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        background: 'var(--bg-card)',
      }}>
        {selectedFile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', padding: '0.25rem 0.5rem', borderRadius: '4px', alignSelf: 'flex-start' }}>
            <img src={selectedFile.dataUrl} alt="Preview" style={{ width: 24, height: 24, objectFit: 'cover', borderRadius: '2px' }} />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{selectedFile.file.name}</span>
            <button onClick={() => setSelectedFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)' }}>
              <X size={12} />
            </button>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.25rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={inputRef}
            className="input"
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about your data..."
            disabled={loading}
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || (!input.trim() && !selectedFile)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: (input.trim() || selectedFile) ? 'var(--gold)' : 'var(--bg-hover)',
              border: 'none', cursor: (input.trim() || selectedFile) ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
              color: (input.trim() || selectedFile) ? '#ffffff' : 'var(--text-muted)',
            }}
          >
            <ArrowUp size={16} />
          </button>
        </div>
      </div>

      {/* Dot pulse animation */}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

export default function AIInsightsPanel({ dataset, filteredRows }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'askdata'>('summary');
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  
  const { isAnalyzingColumns } = useDataset();
  
  const [localInsights, setLocalInsights] = useState<DataInsight | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAskQuestion = (q: string) => {
    setPendingQuestion(q);
    setActiveTab('askdata');
    // Clear after a tick so it re-triggers if the same question is clicked again
    setTimeout(() => setPendingQuestion(null), 100);
  };

  const startAnalysis = async () => {
    if (!dataset) return;
    setIsGenerating(true);
    try {
      const insights = await generateInsights(dataset);
      setDataset(prev => prev ? { ...prev, insights } : null);
      setLocalInsights(insights);
    } catch (e) {
      console.error('Failed to generate insights', e);
    } finally {
      setIsGenerating(false);
    }
  };

  if (isAnalyzingColumns) {
    return (
      <div style={{ height: '100%' }}>
        <div style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          <Bot size={18} color="var(--text-primary)" />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', margin: 0 }}>Insights</h3>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
           <div className="spinner" style={{ margin: '0 auto 1rem' }} />
           <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analyzing columns... AI tools will be available soon.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '1rem', paddingRight: '2.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border)' }}>
        <Bot size={18} color="var(--text-primary)" />
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', margin: 0 }}>Insights</h3>
      </div>

      {/* Tabs - Always active now */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <button onClick={() => setActiveTab('summary')} style={tabStyle(activeTab === 'summary')}>
          <ClipboardList size={14} /> Summary
        </button>
        <button onClick={() => setActiveTab('askdata')} style={tabStyle(activeTab === 'askdata')}>
          <MessageSquare size={14} /> Ask Data
        </button>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflowY: activeTab === 'summary' ? 'auto' : 'hidden', minHeight: 0, position: 'relative' }}>
        
        {/* SUMMARY TAB */}
        <div style={{ display: activeTab === 'summary' ? 'block' : 'none', height: '100%' }}>
          {!localInsights ? (
            <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
              {isGenerating ? (
                <>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Deeply analysing your dataset...</p>
                </>
              ) : (
                <>
                  <div style={{ background: 'rgba(255,193,7,0.1)', padding: '1rem', borderRadius: '50%', color: 'var(--gold)' }}>
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)', fontSize: '1rem' }}>Ready to explore?</h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.6, margin: 0 }}>
                      Our AI can generate a comprehensive summary, detect anomalies, suggest charts, and let you chat with your data.
                    </p>
                  </div>
                  <button
                    onClick={startAnalysis}
                    style={{
                      background: 'var(--gold)',
                      color: 'var(--bg-surface)',
                      border: 'none',
                      padding: '0.625rem 1.25rem',
                      borderRadius: '999px',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'transform 0.1s, opacity 0.2s',
                      boxShadow: '0 4px 12px rgba(255,193,7,0.3)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Bot size={16} /> Unlock AI Insights
                  </button>
                </>
              )}
            </div>
          ) : (
            <SummaryTab insights={localInsights} onAskQuestion={handleAskQuestion} />
          )}
        </div>

        {/* ASK DATA TAB */}
        <div style={{ display: activeTab === 'askdata' ? 'block' : 'none', height: '100%' }}>
          {!localInsights ? (
            <div style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '1.5rem' }}>
              {isGenerating ? (
                <>
                  <div className="spinner" style={{ margin: '0 auto' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Summary is being generated. Please wait a moment...</p>
                </>
              ) : (
                <>
                  <Bot size={32} style={{ opacity: 0.5, marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Generate insights first to start asking questions.</p>
                  <button
                    onClick={() => setActiveTab('summary')}
                    style={{
                      background: 'transparent',
                      color: 'var(--gold)',
                      border: '1px solid var(--gold)',
                      padding: '0.5rem 1rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                    }}
                  >
                    Go to Summary
                  </button>
                </>
              )}
            </div>
          ) : (
            <AskDataTab
              dataset={dataset}
              suggestedQuestions={localInsights.suggestedQuestions || []}
              initialQuestion={pendingQuestion}
            />
          )}
        </div>

      </div>
    </div>
  );
}
