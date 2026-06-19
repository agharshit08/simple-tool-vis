import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { DatasetProvider } from '@/context/DatasetContext';

export const metadata: Metadata = {
  title: 'HistoriaVis — Historical Data Visualization for Humanities',
  description: 'Upload CSV data and explore it through interactive charts, historical geo maps, network graphs, and AI-powered insights. Built for historians, archaeologists, and digital humanities researchers.',
  keywords: 'historical data visualization, digital humanities, geo map, network analysis, historical maps, CSV visualization',
  openGraph: {
    title: 'HistoriaVis',
    description: 'Visualize historical data with AI-powered insights and period-accurate maps.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <DatasetProvider>
          <div className="app-layout">
            <Navbar />
            <main className="app-main">
              <div className="app-content">
                {children}
              </div>
            </main>
          </div>
        </DatasetProvider>
      </body>
    </html>
  );
}
