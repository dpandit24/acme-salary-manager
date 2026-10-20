'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { EmployeeListQuery, SortDirection, SortField, StatusFilter } from '@/lib/api/types';

export const PAGE_SIZE = 25;

const STATUS_VALUES: readonly StatusFilter[] = ['active', 'on_leave', 'terminated', 'all'];
const SORT_VALUES: readonly SortField[] = ['name', 'hire_date', 'salary'];

export interface ListParams {
  q: string;
  country_code: string;
  department: string;
  level: string;
  status: StatusFilter | '';
  page: number;
  sort: SortField;
  direction: SortDirection;
}

export type ListParamKey = keyof ListParams;

export function parse_list_params(search_params: URLSearchParams): ListParams {
  const status = search_params.get('status') ?? '';
  const sort = search_params.get('sort') ?? '';
  const page = Number.parseInt(search_params.get('page') ?? '1', 10);
  return {
    q: search_params.get('q') ?? '',
    country_code: search_params.get('country_code') ?? '',
    department: search_params.get('department') ?? '',
    level: search_params.get('level') ?? '',
    status: (STATUS_VALUES as readonly string[]).includes(status) ? (status as StatusFilter) : '',
    page: Number.isFinite(page) && page >= 1 ? page : 1,
    sort: (SORT_VALUES as readonly string[]).includes(sort) ? (sort as SortField) : 'name',
    direction: search_params.get('direction') === 'desc' ? 'desc' : 'asc',
  };
}

export function to_api_query(params: ListParams): EmployeeListQuery {
  return {
    q: params.q || undefined,
    country_code: params.country_code || undefined,
    department: params.department || undefined,
    level: params.level || undefined,
    status: params.status || undefined,
    page: params.page,
    page_size: PAGE_SIZE,
    sort: params.sort,
    direction: params.direction,
  };
}

export function use_list_params() {
  const search_params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const search_string = search_params.toString();
  const params = React.useMemo(() => parse_list_params(new URLSearchParams(search_string)), [search_string]);

  const update = React.useCallback(
    (patch: Partial<Record<ListParamKey, string | number | undefined>>, options: { reset_page?: boolean } = {}) => {
      const next = new URLSearchParams(search_string);
      for (const [key, value] of Object.entries(patch)) {
        if (value === undefined || value === '') next.delete(key);
        else next.set(key, String(value));
      }
      if (options.reset_page ?? true) next.delete('page');
      if (next.get('page') === '1') next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [search_string, router, pathname],
  );

  const clear = React.useCallback(() => router.replace(pathname, { scroll: false }), [router, pathname]);

  return { params, update, clear };
}
