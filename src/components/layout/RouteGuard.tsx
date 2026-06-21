'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePathname, useRouter } from 'next/navigation';

export default function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // If not loading, not signed in, and not on the landing page -> redirect to landing page
    if (!loading && !user && pathname !== '/') {
      setIsRedirecting(true);
      router.replace('/');
    } else {
      setIsRedirecting(false);
    }
  }, [user, loading, pathname, router]);

  // Show a minimalistic loading spinner during initial auth check or while redirecting
  if (loading || isRedirecting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-deep)' }}>
        <div className="spinner" style={{ width: 32, height: 32, opacity: 0.5 }} />
      </div>
    );
  }

  // Prevent rendering protected content if unauthenticated (even if redirect is pending)
  if (!user && pathname !== '/') {
    return null;
  }

  return <>{children}</>;
}
