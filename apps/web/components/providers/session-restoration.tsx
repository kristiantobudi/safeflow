'use client';

import { useAuthQuery } from '@/store/auth/auth-query';
import { ReactNode, useEffect, useState } from 'react';

export function SessionRestoration({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { isLoading } = useAuthQuery();

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR and before hydration, we must stay consistent with the server.
  // The server renders the children, so we do too during the first pass.
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium animate-pulse">Memulihkan sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
