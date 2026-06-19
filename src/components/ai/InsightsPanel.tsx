'use client';

import { useState, useEffect } from 'react';
import { generateInsights, askQuestion, detectAnomalies, type DataInsight } from '@/lib/aiInsights';
import type { ParsedDataset } from '@/lib/csvParser';
import { Bot, ClipboardList, MessageSquare, AlertTriangle, ArrowRight } from 'lucide-react';
import { useDataset } from '@/context/DatasetContext';

interface Props {
  dataset: ParsedDataset;
  filteredRows: Record<string, string>[];
}

export default function AIInsightsPanel({ dataset, filteredRows }: Props) {
  const [anomalies, setAnomalies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<{ text: string; confidence: string } | null>(null);
  const [qaLoading, setQaLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'insights' | 'qa' | 'patterns'>('insights');
  const [error, setError] = useState<string | null>(null);
  const { isAnalyzingColumns, globalDataInsights, isGeneratingGlobalInsights } = useDataset();

  const insights = globalDataInsights;

  useEffect(() => {
    if (!dataset || isAnalyzingColumns) return;
    setAnomalies([]);
    setError(null);
    setLoading(true);
    detectAnomalies(dataset)
      .then(anom => setAnomalies(anom))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [dataset.filename, isAnalyzingColumns]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setQaLoading(true);
    setAnswer(null);
    try {
      const res = await askQuestion(dataset, question);
      setAnswer({ text: res.answer, confidence: res.confidence });
    } catch (e) {
      setAnswer({ text: 'Unable to answer — please try again.', confidence: 'low' });
    } finally {
      setQaLoading(false);
    }
  };

  if (isAnalyzingColumns) {
    return (
      <div className="ai-panel" style={{ height: '100%' }}>
        <div className="ai-panel-header">
          <Bot size={20} color="var(--text-primary)" />
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', margin: 0 }}>Data Insights</h3>
        </div>
        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="animate-shimmer shimmer-block" style={{ height: '24px', width: '60%', border: '1px solid var(--border)' }} />
          <div className="animate-shimmer shimmer-block" style={{ height: '60px', width: '100%', border: '1px solid var(--border)' }} />
          <div className="animate-shimmer shimmer-block" style={{ height: '60px', width: '100%', border: '1px solid var(--border)' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel" style={{ height: '100%' }}>
      <div className="ai-panel-header">
        <Bot size={20} color="var(--text-primary)" />
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', margin: 0 }}>Data Insights</h3>
        <span className="badge badge-gold" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>Smart Insights</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)' }}>
        {(['insights', 'qa', 'patterns'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            id={`ai-tab-${tab}`}
            style={{
              flex: 1,
              padding: '0.625rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid var(--gold)' : '2px solid transparent',
              color: activeTab === tab ? 'var(--gold)' : 'var(--text-muted)',
              fontSize: '0.75rem',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s',
              textTransform: 'capitalize',
              fontFamily: 'var(--font-sans)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.375rem'
            }}
          >
            {tab === 'insights' && <ClipboardList size={14} />}
            {tab === 'qa' && <MessageSquare size={14} />}
            {tab === 'patterns' && <AlertTriangle size={14} />}
            {tab === 'insights' ? 'Summary' : tab === 'qa' ? 'Ask Data' : 'Patterns'}
          </button>
        ))}
      </div>

      <div className="ai-panel-body" style={{ overflowY: 'auto', maxHeight: '450px' }}>
        {(loading || isGeneratingGlobalInsights) && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="spinner" style={{ margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Analysing your dataset...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '1rem', color: 'var(--crimson-bright)', fontSize: '0.8rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
            <AlertTriangle size={16} />
            <div>
              AI unavailable — Firebase AI Logic not yet enabled for this project. 
              Enable it in the Firebase console under &quot;AI Logic&quot;.
            </div>
          </div>
        )}

        {(!loading && !isGeneratingGlobalInsights) && !error && activeTab === 'insights' && insights && (
          <div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem', fontStyle: 'italic' }}>
              &ldquo;{insights.summary}&rdquo;
            </p>
            <div className="divider" />
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              Key Findings
            </h4>
            {insights.keyFindings.map((f, i) => (
              <div key={i} className="finding-item">
                <div className="finding-dot" />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{f}</span>
              </div>
            ))}
            {insights.chartRecommendations?.length > 0 && (
              <>
                <div className="divider" />
                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  Chart Suggestions
                </h4>
                {insights.chartRecommendations.map((rec, i) => (
                  <div key={i} style={{ marginBottom: '0.5rem' }}>
                    <span className={`badge badge-${rec.type === 'map' ? 'teal' : rec.type === 'network' ? 'crimson' : 'gold'}`}>{rec.type}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>{rec.reason}</span>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {(!loading && !isGeneratingGlobalInsights) && !error && activeTab === 'patterns' && (
          <div>
            <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
              Anomalies & Interesting Patterns
            </h4>
            {anomalies.length === 0 && insights?.patterns?.length === 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No anomalies detected in this dataset.</p>
            )}
            {(anomalies.length > 0 ? anomalies : insights?.patterns || []).map((p, i) => (
              <div key={i} className="finding-item">
                <div className="finding-dot" style={{ background: 'var(--crimson-bright)' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{p}</span>
              </div>
            ))}
            {insights?.suggestions?.length ? (
              <>
                <div className="divider" />
                <h4 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
                  Research Questions
                </h4>
                {insights.suggestions.map((s, i) => (
                  <div key={i} className="finding-item">
                    <div className="finding-dot" style={{ background: 'var(--teal-bright)' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>{s}</span>
                  </div>
                ))}
              </>
            ) : null}
          </div>
        )}

        {!loading && activeTab === 'qa' && (
          <div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Ask any question about your dataset in plain language:
            </p>
            <div className="qa-input-row">
              <input
                className="input"
                type="text"
                placeholder="e.g. Which city appears most often?"
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                id="qa-input"
                aria-label="Ask a question about your data"
                disabled={qaLoading}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={handleAsk}
                disabled={qaLoading || !question.trim()}
                id="qa-submit"
                aria-label="Submit question"
              >
                {qaLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Ask'}
              </button>
            </div>
            {answer && (
              <div className="qa-answer" role="status" aria-live="polite">
                <div style={{ marginBottom: '0.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Confidence:</span>
                  <span className={`badge ${answer.confidence === 'high' ? 'badge-teal' : answer.confidence === 'medium' ? 'badge-gold' : 'badge-crimson'}`}>
                    {answer.confidence}
                  </span>
                </div>
                {answer.text}
              </div>
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Try:</p>
              {[
                'Which city appears most frequently?',
                'What is the time range of this data?',
                'What patterns do you see?',
              ].map(q => (
                <button key={q} onClick={() => setQuestion(q)} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', background: 'none', border: 'none', color: 'var(--gold)', fontSize: '0.75rem', cursor: 'pointer', padding: '3px 0', textAlign: 'left', fontFamily: 'var(--font-sans)' }}>
                  <ArrowRight size={12} /> {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
