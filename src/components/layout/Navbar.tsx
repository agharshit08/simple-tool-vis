'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/', label: 'Home', icon: '⚓' },
  { href: '/upload', label: 'Upload Data', icon: '📜' },
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/map', label: 'Geo Map', icon: '🗺️' },
  { href: '/network', label: 'Network', icon: '🕸️' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <Link href="/" className="navbar-brand" aria-label="HistoriaVis Home">
        <span className="logo-icon" aria-hidden="true">🧭</span>
        <span className="logo-text">HistoriaVis</span>
      </Link>
    </nav>
  );
}
