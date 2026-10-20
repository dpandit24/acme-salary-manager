'use client';

import * as React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api, query_keys } from '@/lib/api/endpoints';
import type { CurrencyStats, Overview, UsdStats } from '@/lib/api/types';
import { format_money } from '@/lib/money';
import { format_count, today_iso } from '@/lib/utils';
import { use_meta } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ErrorState, LoadingState } from '@/components/state-messages';

export function OverviewScreen({ initial_as_of }: { initial_as_of?: string }) {
  const [as_of, set_as_of] = React.useState(initial_as_of ?? today_iso());
  const overview = useQuery({ queryKey: query_keys.overview(as_of), queryFn: () => api.overview(as_of) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">How ACME pays</h1>
          <p className="text-sm text-muted-foreground">
            Current annual base pay for active and on-leave employees, as of the selected date.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="as-of">As of date</Label>
          <Input
            id="as-of"
            type="date"
            className="w-44"
            value={as_of}
            required
            onChange={(event) => {
              if (event.target.value) set_as_of(event.target.value);
            }}
          />
        </div>
      </div>

      {overview.isPending ? (
        <LoadingState label="Loading overview…" />
      ) : overview.isError ? (
        <ErrorState title="Could not load the overview" error={overview.error} on_retry={() => void overview.refetch()} />
      ) : (
        <OverviewBody data={overview.data} />
      )}
    </div>
  );
}

function Question({
  title,
  definition,
  children,
}: {
  title: string;
  definition: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {children}
        <CardDescription>{definition}</CardDescription>
      </CardContent>
    </Card>
  );
}

function OverviewBody({ data }: { data: Overview }) {
  const usd_rate_note = `USD snapshot · rates as of ${data.usd.rate_as_of}`;
  return (
    <>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Figures as of {data.as_of}.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Question
          title="How many people are we paying?"
          definition="Active and on leave, as of the selected date."
        >
          <p className="text-3xl font-semibold" data-testid="headcount">
            {format_count(data.headcount)} people
          </p>
        </Question>
        <Question
          title="What is payroll in USD?"
          definition={`Snapshot conversion of every current annual base into USD. Rates as of ${data.usd.rate_as_of}.`}
        >
          <p className="text-3xl font-semibold">{format_money(data.usd.total_minor, 'USD')}</p>
          <p className="text-sm font-medium">{data.usd.label || 'USD snapshot'} · rates as of {data.usd.rate_as_of}</p>
        </Question>
      </div>

      <Question title="What is payroll in each currency?" definition="Sum of current annual base. No conversion.">
        <CurrencyTable rows={data.by_currency} caption="Payroll by contract currency" />
      </Question>

      <Question
        title="What does a typical employee earn?"
        definition="Median is typical pay. Average is pulled up by senior levels."
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-muted-foreground">Median ({usd_rate_note})</dt>
            <dd className="text-xl font-semibold">{format_money(data.usd.median_minor, 'USD')}</dd>
          </div>
          <div>
            <dt className="text-sm text-muted-foreground">Average ({usd_rate_note})</dt>
            <dd className="text-xl font-semibold">{format_money(data.usd.average_minor, 'USD')}</dd>
          </div>
        </dl>
        <p className="text-sm text-muted-foreground">Per-currency median and average are in the payroll table above.</p>
      </Question>

      <GroupSection
        title="How does pay differ by country?"
        key_label="Country"
        rate_as_of={data.usd.rate_as_of}
        groups={data.by_country.map((g) => ({
          key: g.country_code,
          label: <CountryLabel code={g.country_code} />,
          href: `/employees?country_code=${encodeURIComponent(g.country_code)}`,
          headcount: g.headcount,
          by_currency: g.by_currency,
          usd: g.usd,
        }))}
      />
      <GroupSection
        title="How does pay differ by department?"
        key_label="Department"
        rate_as_of={data.usd.rate_as_of}
        groups={data.by_department.map((g) => ({
          key: g.department,
          label: g.department,
          href: `/employees?department=${encodeURIComponent(g.department)}`,
          headcount: g.headcount,
          by_currency: g.by_currency,
          usd: g.usd,
        }))}
      />
      <GroupSection
        title="How does pay differ by level?"
        key_label="Level"
        rate_as_of={data.usd.rate_as_of}
        groups={data.by_level.map((g) => ({
          key: g.level,
          label: g.level,
          headcount: g.headcount,
          by_currency: g.by_currency,
          usd: g.usd,
        }))}
      />
    </>
  );
}

function CountryLabel({ code }: { code: string }) {
  const meta = use_meta();
  const name = meta.data?.countries.find((c) => c.code === code)?.name;
  return <>{name ? `${name} (${code})` : code}</>;
}

function CurrencyTable({ rows, caption }: { rows: CurrencyStats[]; caption: string }) {
  return (
    <Table aria-label={caption}>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Currency</TableHead>
          <TableHead scope="col" className="text-right">Headcount</TableHead>
          <TableHead scope="col" className="text-right">Total annual base</TableHead>
          <TableHead scope="col" className="text-right">Median</TableHead>
          <TableHead scope="col" className="text-right">Average</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.currency}>
            <TableCell className="font-medium">{row.currency}</TableCell>
            <TableCell className="text-right tabular-nums">{format_count(row.headcount)}</TableCell>
            <TableCell className="text-right tabular-nums">{format_money(row.total_minor, row.currency)}</TableCell>
            <TableCell className="text-right tabular-nums">{format_money(row.median_minor, row.currency)}</TableCell>
            <TableCell className="text-right tabular-nums">{format_money(row.average_minor, row.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface GroupRow {
  key: string;
  label: React.ReactNode;
  href?: string;
  headcount: number;
  by_currency: CurrencyStats[];
  usd: UsdStats;
}

function GroupSection({
  title,
  key_label,
  rate_as_of,
  groups,
}: {
  title: string;
  key_label: string;
  rate_as_of: string;
  groups: GroupRow[];
}) {
  return (
    <Question
      title={title}
      definition={`Headcount, one line per contract currency (never merged), and the group's USD snapshot total (rates as of ${rate_as_of}).`}
    >
      <Table aria-label={title}>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">{key_label}</TableHead>
            <TableHead scope="col" className="text-right">Headcount</TableHead>
            <TableHead scope="col">Currency</TableHead>
            <TableHead scope="col" className="text-right">Total annual base</TableHead>
            <TableHead scope="col" className="text-right">Median</TableHead>
            <TableHead scope="col" className="text-right">Average</TableHead>
            <TableHead scope="col" className="text-right">USD snapshot total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => {
            const lines = group.by_currency.length > 0 ? group.by_currency : [null];
            const span = lines.length;
            return lines.map((line, index) => (
              <TableRow key={`${group.key}-${line?.currency ?? 'none'}`}>
                {index === 0 ? (
                  <>
                    <TableCell rowSpan={span} className="font-medium">
                      {group.href ? (
                        <Link href={group.href} className="text-primary underline underline-offset-4">
                          {group.label}
                        </Link>
                      ) : (
                        group.label
                      )}
                    </TableCell>
                    <TableCell rowSpan={span} className="text-right tabular-nums">
                      {format_count(group.headcount)}
                    </TableCell>
                  </>
                ) : null}
                {line ? (
                  <>
                    <TableCell>
                      {line.currency} <span className="text-muted-foreground">({format_count(line.headcount)})</span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{format_money(line.total_minor, line.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format_money(line.median_minor, line.currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{format_money(line.average_minor, line.currency)}</TableCell>
                  </>
                ) : (
                  <TableCell colSpan={4} className="text-muted-foreground">
                    No current pay
                  </TableCell>
                )}
                {index === 0 ? (
                  <TableCell rowSpan={span} className="text-right tabular-nums">
                    {format_money(group.usd.total_minor, 'USD')}
                  </TableCell>
                ) : null}
              </TableRow>
            ));
          })}
        </TableBody>
      </Table>
    </Question>
  );
}
