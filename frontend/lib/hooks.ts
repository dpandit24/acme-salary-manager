'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, query_keys } from './api/endpoints';

export function use_me() {
  return useQuery({ queryKey: query_keys.me, queryFn: api.me, retry: false, staleTime: 5 * 60_000 });
}

export function use_meta() {
  return useQuery({ queryKey: query_keys.meta, queryFn: api.meta, staleTime: 10 * 60_000 });
}

export function use_debounced_value<T>(value: T, delay_ms: number): T {
  const [debounced, set_debounced] = React.useState(value);
  React.useEffect(() => {
    const handle = setTimeout(() => set_debounced(value), delay_ms);
    return () => clearTimeout(handle);
  }, [value, delay_ms]);
  return debounced;
}
