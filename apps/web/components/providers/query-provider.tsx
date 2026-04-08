'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { SWRConfig } from 'swr';
import { fetcher } from '@/lib/fetcher';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SWRConfig value={{ fetcher }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SWRConfig>
  );
}
