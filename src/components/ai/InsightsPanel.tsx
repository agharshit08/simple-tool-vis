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
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--bg-main)' }}>
      
      {/* 1. Executive Summary & Hypothesis (Full Width) */}
      <div className="premium-card" style={{ padding: '1.5rem' }}>
        <h4 style={{ ...sectionTitle, marginTop: 0 }}><Sparkles size={14} color="var(--gold)" /> Executive Summary</h4>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-primary)', lineHeight: 1.7 }}>
          {insights.summary}
        </p>
        
        {insights.researchHypothesis && (
          <div style={{
            marginTop: '1.25rem', padding: '1rem', borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(212, 175, 55, 0.02))',
            border: '1px solid rgba(212, 175, 55, 0.2)', fontSize: '0.875rem', color: 'var(--text-secondary)',
            lineHeight: 1.6, fontStyle: 'italic', display: 'flex', gap: '0.75rem', alignItems: 'flex-start'
          }}>
            <Lightbulb size={18} color="var(--gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.25rem', fontStyle: 'normal' }}>Research Hypothesis</strong>
              {insights.researchHypothesis}
            </div>
          </div>
        )}
      </div>

      {/* 2. Grid Layout for Details */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Data Analysis (Findings, Patterns, Anomalies) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {insights.keyFindings?.length > 0 && (
            <div className="premium-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ ...sectionTitle, marginTop: 0 }}><BarChart3 size={14} /> Key Findings</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {insights.keyFindings.map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', marginTop: 7, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {insights.patterns?.length > 0 && (
            <div className="premium-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ ...sectionTitle, marginTop: 0 }}><TrendingUp size={14} /> Identified Patterns</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.patterns.map((p, i) => (
                  <div key={i} style={{
                    padding: '0.625rem 0.875rem', background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                  }}>{p}</div>
                ))}
              </div>
            </div>
          )}

          {insights.anomalies?.length > 0 && (
            <div className="premium-card" style={{ padding: '1.25rem', borderColor: 'rgba(255, 193, 7, 0.3)' }}>
              <h4 style={{ ...sectionTitle, marginTop: 0 }}><AlertTriangle size={14} color="var(--gold)" /> Anomalies</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.anomalies.map((a, i) => (
                  <div key={i} style={{
                    padding: '0.625rem 0.875rem', background: 'rgba(255, 193, 7, 0.04)', borderRadius: 'var(--radius-sm)',
                    border: '1px solid rgba(255, 193, 7, 0.2)', fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5,
                  }}>{a}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Next Steps (Charts, Networks, Questions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {(insights.chartRecommendations?.length > 0 || insights.networkRecommendations?.length > 0) && (
            <div className="premium-card" style={{ padding: '1.25rem' }}>
              <h4 style={{ ...sectionTitle, marginTop: 0 }}><MapPin size={14} /> Visualization Suggestions</h4>
              
              {insights.chartRecommendations?.map((rec, i) => (
                <div key={`chart-${i}`} style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <span style={{
                      padding: '0.25rem 0.625rem', borderRadius: '999px', background: 'var(--bg-main)',
                      border: `1px solid ${badgeColor(rec.type)}`, fontSize: '0.7rem', color: badgeColor(rec.type),
                      fontWeight: 600, textTransform: 'uppercase'
                    }}>{rec.type}</span>
                    <span style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                      {rec.columns?.join(' × ')}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {rec.reason}
                  </div>
                </div>
              ))}

              {insights.networkRecommendations?.map((rec, i) => (
                <div key={`net-${i}`} style={{ marginBottom: '1rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                    <span style={{
                      padding: '0.25rem 0.625rem', borderRadius: '999px', background: 'var(--bg-main)',
                      border: '1px solid var(--crimson-bright)', fontSize: '0.7rem', color: 'var(--crimson-bright)',
                      fontWeight: 600, textTransform: 'uppercase'
                    }}>NETWORK</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem', marginBottom: '0.375rem' }}>
                    {rec.relationships?.map((r, j) => (
                      <span key={j} style={{ fontSize: '0.75rem', color: 'var(--text-primary)', background: 'var(--bg-hover)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>
                        {r.source} → {r.target}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {rec.reason}
                  </div>
                </div>
              ))}
            </div>
          )}

          {insights.suggestedQuestions?.length > 0 && (
            <div className="premium-card" style={{ padding: '1.25rem', background: 'linear-gradient(to bottom, var(--bg-card), var(--bg-main))' }}>
              <h4 style={{ ...sectionTitle, marginTop: 0 }}><MessageSquare size={14} /> Ask Your Data</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Click a question to instantly start an AI chat about this dataset.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {insights.suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => onAskQuestion(q)}
                    style={{
                      padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)', border: '1px solid var(--border)',
                      fontSize: '0.8125rem', color: 'var(--gold)', fontWeight: 500,
                      cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
                      transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                      display: 'flex', alignItems: 'center', gap: '0.5rem'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(212,175,55,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <MessageSquare size={14} />
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ─── Ask Data Tab ───────────────────────────────────────────────────

function AskDataTab({ dataset, suggestedQuestions, initialQuestion }: {
  dataset: ParsedDataset;
  suggestedQuestions: string[];
  initialQuestion: string | null;
}) {
  const { chatInstance, setChatInstance, chatMessages, setChatMessages } = useDataset();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Init chat if it doesn't exist
  useEffect(() => {
    if (!chatInstance) {
      setChatInstance(createDataChat(dataset));
      setChatMessages([]);
    }
  }, [dataset, chatInstance, setChatInstance, setChatMessages]);

  // Handle initial question from Summary tab
  useEffect(() => {
    if (initialQuestion && chatInstance) {
      setInput('');
      handleSend(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion, chatInstance]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const handleSend = useCallback(async (text?: string) => {
    const question = (text || input).trim();
    if (!question || !chatInstance || loading) return;
    
    setInput('');
    setLoading(true);
    
    // Optimistic UI update for the user's message
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);
    
    try {
      await chatInstance.sendMessage(question);
      // Sync global state with chat history which now contains both the user message and model reply
      setChatMessages(chatInstance.getHistory());
    } catch {
      setChatMessages(prev => [...prev, { role: 'model', text: 'Sorry, I could not process that. Please try again.' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, chatInstance, loading, setChatMessages]);

  const handleReset = () => {
    if (!chatInstance) return;
    chatInstance.reset();
    setChatMessages([]);
    setInput('');
  };

  const noMessages = chatMessages.length === 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
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
        {chatMessages.map((msg, i) => (
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
                ? 'var(--bg-hover)'
                : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: '0.8125rem',
              lineHeight: 1.6,
              border: msg.role === 'model' ? '1px solid var(--border)' : 'none',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}>
              <div className="markdown-message">
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
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
            disabled={loading || !input.trim()}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: input.trim() ? 'var(--gold)' : 'var(--bg-hover)',
              border: 'none', cursor: input.trim() ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s', flexShrink: 0,
              color: input.trim() ? '#ffffff' : 'var(--text-muted)',
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
        .markdown-message p:first-child { margin-top: 0; }
        .markdown-message p:last-child { margin-bottom: 0; }
      `}</style>
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────

export default function AIInsightsPanel({ dataset, filteredRows }: Props) {
  const [activeTab, setActiveTab] = useState<'summary' | 'askdata'>('summary');
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  
  const { isAnalyzingColumns, setDataset } = useDataset();
  
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
           <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Aeterna is profiling your dataset... Your insights will be ready shortly.</p>
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
