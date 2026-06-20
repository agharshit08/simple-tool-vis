import type { Metadata } from 'next';
import Link from 'next/link';
import { Database, Map, BarChart, Network, Clock, Sparkles } from 'lucide-react';
import LandingCTA from '@/components/ui/LandingCTA';

export const metadata: Metadata = {
  title: 'Aeterna — Historical Data Visualization for Humanities',
  description: 'Upload CSV data and explore it through interactive charts, historical geo maps, network graphs, and smart insights.',
};

const FEATURES = [
  {
    icon: <Database size={24} strokeWidth={1.5} />,
    title: 'Intelligent Data Ingestion',
    desc: 'Drag and drop any historical CSV. Our system automatically detects cities, dates, people, and relationships without complex configuration.',
  },
  {
    icon: <Map size={24} strokeWidth={1.5} />,
    title: 'Period-Accurate Geo Maps',
    desc: 'Plot locations on dynamic historical maps. Switch between centuries to see political borders shift alongside your data.',
  },
  {
    icon: <Network size={24} strokeWidth={1.5} />,
    title: 'Force-Directed Networks',
    desc: 'Uncover hidden connections. Visualize social ties, trade routes, and scholarly correspondence through interactive network graphs.',
  },
  {
    icon: <BarChart size={24} strokeWidth={1.5} />,
    title: 'Dynamic Visualizations',
    desc: 'Auto-generated charts that respond to a global time slider. Watch trends evolve across decades and centuries in real-time.',
  },
  {
    icon: <Sparkles size={24} strokeWidth={1.5} />,
    title: 'AI-Powered Insights',
    desc: 'Ask questions in natural language. Our AI summarizes your dataset, surfaces hidden anomalies, and acts as your research assistant.',
  },
  {
    icon: <Clock size={24} strokeWidth={1.5} />,
    title: 'Temporal Navigation',
    desc: 'Time is a first-class dimension. Seamlessly filter, animate, and compare historical events across eras with precision control.',
  },
];



export default function HomePage() {
  return (
    <section className="hero mesh-bg" aria-label="Aeterna landing page">


      {/* Heading */}
      <h1 className="hero-title animate-in-delay-1">
        Unearth the Stories<br />
        Hidden in Your <span className="accent">Data</span>
      </h1>

      <p className="hero-desc animate-in-delay-2">
        A seamless visual workspace for historians, archaeologists, and researchers. 
        Transform static spreadsheets into vivid maps, interactive networks, and AI-driven discoveries.
      </p>

      {/* CTA */}
      <LandingCTA />

      {/* Feature Cards */}
      <div className="features-grid">
        {FEATURES.map((f, i) => (
          <article key={f.title} className={`premium-card stagger-${(i % 6) + 1}`} aria-label={f.title}>
            <div className="icon-box" aria-hidden="true">{f.icon}</div>
            <h4>{f.title}</h4>
            <p>{f.desc}</p>
          </article>
        ))}
      </div>


    </section>
  );
}
