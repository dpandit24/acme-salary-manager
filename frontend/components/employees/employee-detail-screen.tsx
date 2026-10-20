'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import { is_api_error } from '@/lib/api/client';
import type { Compensation, EmployeeDetail } from '@/lib/api/types';
import { format_money } from '@/lib/money';
import { REASON_LABELS } from '@/lib/utils';
import { use_meta } from '@/lib/hooks';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TiltCard } from '@/components/ui/tilt-card';
import { ArrowLeftIcon, BanknoteIcon } from '@/components/icons';
import { StatusBadge } from '@/components/status-badge';
import { EmptyState, ErrorState, LoadingState } from '@/components/state-messages';
import { ProfileForm } from './profile-form';
import { CorrectCompensationDialog, RecordChangeForm } from './pay-forms';

export function EmployeeDetailScreen({ id }: { id: string }) {
  const detail = useQuery({ queryKey: query_keys.employee(id), queryFn: () => api.get_employee(id), staleTime: 0 });

  if (detail.isPending) return <LoadingState label="Loading employee…" />;
  if (detail.isError) {
    if (is_api_error(detail.error) && detail.error.status === 404) {
      return (
        <EmptyState title="Employee not found">
          <Link href="/employees" className="text-primary underline underline-offset-4">
            Back to employees
          </Link>
        </EmptyState>
      );
    }
    return <ErrorState title="Could not load this employee" error={detail.error} on_retry={() => void detail.refetch()} />;
  }
  return <EmployeeDetailBody employee={detail.data} />;
}

function EmployeeDetailBody({ employee }: { employee: EmployeeDetail }) {
  const meta = use_meta();
  const [correcting, set_correcting] = React.useState<Compensation | null>(null);
  const currencies = meta.data?.currencies ?? [];
  const country_default = meta.data?.countries.find((c) => c.code === employee.country_code)?.default_currency;
  const default_currency = employee.current_compensation?.currency ?? country_default ?? '';
  const history = [...employee.compensations].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  const current = employee.current_compensation;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/employees"
          className="group inline-flex items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
          Back to employees
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span
            aria-hidden="true"
            className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-base font-semibold text-white shadow-sm"
          >
            {employee.first_name.charAt(0)}
            {employee.last_name.charAt(0)}
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            {employee.first_name} {employee.last_name}
          </h1>
          <StatusBadge status={employee.status} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {employee.employee_number} · {employee.job_title} · {employee.level} · {employee.department} ·{' '}
          {employee.country_code} · hired {employee.hire_date}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <TiltCard className="self-start lg:col-span-1">
          <div className="h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-500" aria-hidden="true" />
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <CardTitle>Current pay</CardTitle>
                <CardDescription>Annual base in contract currency, as of today.</CardDescription>
              </div>
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-50 text-emerald-700 transition-transform duration-300 group-hover:scale-110">
                <BanknoteIcon className="size-[18px]" />
              </span>
            </div>
          </CardHeader>
          <CardContent className="pb-6">
            {current ? (
              <div className="flex flex-col gap-2">
                <p className="text-3xl font-semibold tracking-tight tabular-nums" data-testid="current-pay">
                  {format_money(current.amount_minor, current.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Effective from {current.effective_from} · {REASON_LABELS[current.reason] ?? current.reason}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground" data-testid="current-pay">
                — No pay yet (no row is effective today)
              </p>
            )}
          </CardContent>
        </TiltCard>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileForm employee={employee} meta={meta.data} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pay history</CardTitle>
          <CardDescription>Oldest first. Future-dated rows become current on their date.</CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No compensation rows yet.</p>
          ) : (
            <Table aria-label="Pay history">
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Effective from</TableHead>
                  <TableHead scope="col" className="text-right">Annual base</TableHead>
                  <TableHead scope="col">Currency</TableHead>
                  <TableHead scope="col">Reason</TableHead>
                  <TableHead scope="col">Note</TableHead>
                  <TableHead scope="col">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {row.effective_from}
                      {current?.id === row.id ? <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">(current)</span> : null}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {format_money(row.amount_minor, row.currency)}
                    </TableCell>
                    <TableCell>{row.currency}</TableCell>
                    <TableCell>{REASON_LABELS[row.reason] ?? row.reason}</TableCell>
                    <TableCell className="max-w-xs break-words">{row.note ?? '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => set_correcting(row)}
                        aria-label={`Correct row from ${row.effective_from}`}
                      >
                        Correct
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Record a change</CardTitle>
          <CardDescription>Adds a new dated row (merit, promotion, or market adjustment). Earlier rows stay.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecordChangeForm
            key={`${employee.id}-${default_currency}`}
            employee_id={employee.id}
            default_currency={default_currency}
            currencies={currencies}
          />
        </CardContent>
      </Card>

      <CorrectCompensationDialog
        employee_id={employee.id}
        compensation={correcting}
        currencies={currencies}
        on_close={() => set_correcting(null)}
      />
    </div>
  );
}
