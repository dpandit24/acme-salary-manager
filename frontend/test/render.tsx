import * as React from 'react';
import { render } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { make_query_client } from '@/components/providers';

export function render_with_client(ui: React.ReactElement) {
  const client = make_query_client();
  client.setDefaultOptions({
    queries: { ...client.getDefaultOptions().queries, retry: false, staleTime: 0, gcTime: Infinity },
    mutations: { retry: false },
  });
  return { client, ...render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>) };
}
