import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, Map, BarChart, Network, Bot, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'HistoriaVis — Historical Data Visualization for Humanities',
  description: 'Upload CSV data and explore it through interactive charts, historical geo maps, network graphs, and smart insights.',
};

const FEATURES = [
  {
    icon: <Database size={24} color="var(--primary)" />,
    title: 'CSV Upload & Auto Detection',
    desc: 'Upload any spreadsheet. Background analysis auto-detects columns — cities, dates, people, relationships — and maps them intelligently.',
  },
  {
    icon: <Map size={24} color="var(--primary)" />,
    title: 'Historical Geo Maps',
    desc: 'Plot cities on period-accurate maps. Switch between 1600s, 1700s, and 1800s political borders. Historical names auto-resolved.',
  },
  {
    icon: <BarChart size={24} color="var(--primary)" />,
    title: 'Dynamic Charts',
    desc: 'Auto-generated bar, line, scatter charts. A global time slider filters all views in sync — watch history unfold.',
  },
  {
    icon: <Network size={24} color="var(--primary)" />,
    title: 'Network Analysis',
    desc: 'Detect relationships between entities. Force-directed graphs reveal social networks, trade routes, and scholarly connections.',
  },
  {
    icon: <Bot size={24} color="var(--primary)" />,
    title: 'Smart Insights',
    desc: 'Smart Insights summarises your dataset, surfaces hidden patterns, and answers natural language questions about your data.',
  },
  {
    icon: <Clock size={24} color="var(--primary)" />,
    title: 'Temporal Exploration',
    desc: 'Time is a first-class dimension. Filter, animate, and compare data across decades and centuries effortlessly.',
  },
];

const SAMPLE_DATASETS = [
  { label: 'European Trade Routes 1580–1720', tag: 'Commerce' },
  { label: 'Renaissance Scholars Network', tag: 'Prosopography' },
  { label: 'Roman Empire Archaeological Sites', tag: 'Archaeology' },
];

export default function HomePage() {
  return (
    <section className="hero gradient-bg" aria-label="HistoriaVis landing page">
      {/* Eyebrow */}
      <p className="hero-eyebrow animate-in" aria-hidden="false">
        Digital Humanities Visualization
      </p>

      {/* Heading */}
      <h1 className="animate-in-delay-1">
        Turn Historical Data into<br />
        <span className="accent">Vivid Discoveries</span>
      </h1>

      <p className="hero-desc animate-in-delay-2">
        Upload CSV data and explore it through interactive charts, historical geo maps, network graphs, 
        and smart insights — built for historians, archaeologists, and digital humanists.
      </p>

      {/* CTA */}
      <div className="hero-cta animate-in-delay-3">
        <Link href="/upload" className="btn btn-primary btn-lg" id="cta-upload">
          📜 Upload Your Dataset
        </Link>
        <Link href="/dashboard" className="btn btn-ghost btn-lg" id="cta-demo">
          📊 View Demo Dashboard
        </Link>
      </div>

      {/* Feature Cards */}
      <div className="features-grid animate-in-delay-3">
        {FEATURES.map((f) => (
          <article key={f.title} className="feature-card" aria-label={f.title}>
            <span className="feature-icon" aria-hidden="true">{f.icon}</span>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </article>
        ))}
      </div>

      {/* Sample datasets teaser */}
      <div style={{ marginTop: '3rem', display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Try sample data:</span>
        {SAMPLE_DATASETS.map(ds => (
          <Link href="/upload" key={ds.label} className="badge badge-gold" style={{ cursor: 'pointer', textDecoration: 'none' }}>
            {ds.tag}: {ds.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
