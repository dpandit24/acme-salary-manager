'use client';

import * as React from 'react';
import Link from 'next/link';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import type { EmployeeListItem, SortField } from '@/lib/api/types';
import { format_money } from '@/lib/money';
import { format_count } from '@/lib/utils';
import { use_debounced_value, use_meta } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/state-messages';
import { PAGE_SIZE, to_api_query, use_list_params, type ListParams } from './use-list-params';

export const SEARCH_DEBOUNCE_MS = 300;

export function EmployeeListScreen() {
  const { params, update, clear } = use_list_params();
  const meta = use_meta();
  const api_query = React.useMemo(() => to_api_query(params), [params]);
  const list = useQuery({
    queryKey: query_keys.employees(api_query),
    queryFn: () => api.list_employees(api_query),
    placeholderData: keepPreviousData,
  });

  const [search, set_search] = React.useState(params.q);
  const debounced_search = use_debounced_value(search, SEARCH_DEBOUNCE_MS);

  const pushed_q = React.useRef(params.q);

  const push_q = (value: string) => {
    const trimmed = value.trim();
    if (trimmed === pushed_q.current) return;
    pushed_q.current = trimmed;
    update({ q: trimmed || undefined });
  };

  React.useEffect(() => {
    push_q(debounced_search);
  }, [debounced_search]);

  React.useEffect(() => {
    if (params.q !== pushed_q.current) {
      pushed_q.current = params.q;
      set_search(params.q);
    }
  }, [params.q]);

  const clear_filters = () => {
    pushed_q.current = '';
    set_search('');
    clear();
  };

  const on_sort = (field: SortField) => {
    if (params.sort === field) {
      update({ sort: field, direction: params.direction === 'asc' ? 'desc' : 'asc' });
    } else {
      update({ sort: field, direction: field === 'salary' ? 'desc' : 'asc' });
    }
  };

  const countries = meta.data?.countries ?? [];
  const departments = meta.data?.departments ?? [];
  const levels = meta.data?.levels ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Employees</h1>
        <Button asChild>
          <Link href="/employees/new">Add employee</Link>
        </Button>
      </div>

      <form
        role="search"
        aria-label="Filter employees"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6"
        onSubmit={(event) => {
          event.preventDefault();
          push_q(search);
        }}
      >
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <Label htmlFor="filter-q">Search</Label>
          <Input
            id="filter-q"
            type="search"
            placeholder="Name, email or employee number"
            value={search}
            onChange={(event) => set_search(event.target.value)}
          />
        </div>
        <FilterSelect
          id="filter-country"
          label="Country"
          value={params.country_code}
          all_label="All countries"
          options={countries.map((c) => ({ value: c.code, label: `${c.name} (${c.code})` }))}
          on_change={(value) => update({ country_code: value })}
        />
        <FilterSelect
          id="filter-department"
          label="Department"
          value={params.department}
          all_label="All departments"
          options={departments.map((d) => ({ value: d, label: d }))}
          on_change={(value) => update({ department: value })}
        />
        <FilterSelect
          id="filter-level"
          label="Level"
          value={params.level}
          all_label="All levels"
          options={levels.map((l) => ({ value: l, label: l }))}
          on_change={(value) => update({ level: value })}
        />
        <FilterSelect
          id="filter-status"
          label="Status"
          value={params.status}
          all_label="Active and on leave"
          options={[
            { value: 'active', label: 'Active' },
            { value: 'on_leave', label: 'On leave' },
            { value: 'terminated', label: 'Terminated' },
            { value: 'all', label: 'All statuses' },
          ]}
          on_change={(value) => update({ status: value })}
        />
      </form>

      {list.isPending ? (
        <LoadingState label="Loading employees…" />
      ) : list.isError ? (
        <ErrorState title="Could not load employees" error={list.error} on_retry={() => void list.refetch()} />
      ) : list.data.total === 0 ? (
        <EmptyState title="No employees match these filters">
          <Button variant="outline" onClick={clear_filters}>
            Clear filters
          </Button>
        </EmptyState>
      ) : list.data.items.length === 0 ? (
        <EmptyState title="This page is past the end of the results">
          <Button variant="outline" onClick={() => update({ page: undefined }, { reset_page: true })}>
            Go to first page
          </Button>
        </EmptyState>
      ) : (
        <>
          {list.isPlaceholderData ? (
            <p role="status" className="text-sm text-muted-foreground">
              Updating…
            </p>
          ) : null}
          <EmployeeTable items={list.data.items} params={params} on_sort={on_sort} />
          <Pager
            page={list.data.page}
            page_size={list.data.page_size || PAGE_SIZE}
            total={list.data.total}
            on_page={(page) => update({ page }, { reset_page: false })}
          />
        </>
      )}
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  all_label,
  options,
  on_change,
}: {
  id: string;
  label: string;
  value: string;
  all_label: string;
  options: { value: string; label: string }[];
  on_change: (value: string | undefined) => void;
}) {
  const has_value = value === '' || options.some((o) => o.value === value);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(event) => on_change(event.target.value || undefined)}>
        <option value="">{all_label}</option>
        {!has_value ? <option value={value}>{value}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

function SortHeader({
  field,
  label,
  params,
  on_sort,
  className,
}: {
  field: SortField;
  label: string;
  params: ListParams;
  on_sort: (field: SortField) => void;
  className?: string;
}) {
  const active = params.sort === field;
  const aria_sort = active ? (params.direction === 'asc' ? 'ascending' : 'descending') : 'none';
  return (
    <TableHead scope="col" aria-sort={aria_sort} className={className}>
      <button
        type="button"
        onClick={() => on_sort(field)}
        className="inline-flex items-center gap-1 rounded-sm font-medium hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <span aria-hidden="true">{active ? (params.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
      </button>
    </TableHead>
  );
}

function EmployeeTable({
  items,
  params,
  on_sort,
}: {
  items: EmployeeListItem[];
  params: ListParams;
  on_sort: (field: SortField) => void;
}) {
  const salary_sort = params.sort === 'salary';
  return (
    <Table aria-label="Employees">
      {salary_sort ? (
        <TableCaption>
          Sorted by salary in USD equivalent (snapshot rates). Each cell shows contract currency; the muted line is the
          USD equivalent used for ordering.
        </TableCaption>
      ) : null}
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Employee #</TableHead>
          <SortHeader field="name" label="Name" params={params} on_sort={on_sort} />
          <TableHead scope="col">Country</TableHead>
          <TableHead scope="col">Department</TableHead>
          <TableHead scope="col">Level</TableHead>
          <TableHead scope="col">Status</TableHead>
          <SortHeader
            field="salary"
            label={salary_sort ? 'Salary (USD equiv.)' : 'Current annual pay (contract currency)'}
            params={params}
            on_sort={on_sort}
            className="text-right"
          />
          <SortHeader field="hire_date" label="Hire date" params={params} on_sort={on_sort} />
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="whitespace-nowrap font-mono text-xs">{item.employee_number}</TableCell>
            <TableCell>
              <Link href={`/employees/${item.id}`} className="font-medium text-primary underline-offset-4 hover:underline">
                {item.first_name} {item.last_name}
              </Link>
            </TableCell>
            <TableCell>{item.country_code}</TableCell>
            <TableCell>{item.department}</TableCell>
            <TableCell>{item.level}</TableCell>
            <TableCell>
              <StatusBadge status={item.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-right tabular-nums">
              {item.amount_minor !== null && item.currency ? (
                <>
                  <div>{format_money(item.amount_minor, item.currency)}</div>
                  {salary_sort && item.amount_usd_minor !== null ? (
                    <div className="text-xs text-muted-foreground">≈ {format_money(item.amount_usd_minor, 'USD')} equiv.</div>
                  ) : null}
                </>
              ) : (
                <span className="text-muted-foreground">No pay yet</span>
              )}
            </TableCell>
            <TableCell className="whitespace-nowrap">{item.hire_date}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Pager({
  page,
  page_size,
  total,
  on_page,
}: {
  page: number;
  page_size: number;
  total: number;
  on_page: (page: number) => void;
}) {
  const start = (page - 1) * page_size + 1;
  const end = Math.min(page * page_size, total);
  const last_page = Math.max(1, Math.ceil(total / page_size));
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm" aria-live="polite">
        {format_count(start)}–{format_count(end)} of {format_count(total)}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => on_page(page - 1)}>
          Previous page
        </Button>
        <Button variant="outline" size="sm" disabled={page >= last_page} onClick={() => on_page(page + 1)}>
          Next page
        </Button>
      </div>
    </nav>
  );
}
