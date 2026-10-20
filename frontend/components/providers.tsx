'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { is_api_error } from '@/lib/api/client';

export function make_query_client(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: (failure_count, error) => {
          if (is_api_error(error) && error.status >= 400 && error.status < 500) return false;
          return failure_count < 1;
        },
      },
      mutations: { retry: false },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = React.useState(make_query_client);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
