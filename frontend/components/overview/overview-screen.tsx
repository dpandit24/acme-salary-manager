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
import { TiltCard } from '@/components/ui/tilt-card';
import { BanknoteIcon, BarsIcon, TrendIcon, UsersIcon } from '@/components/icons';
import { ErrorState, LoadingState } from '@/components/state-messages';

export function OverviewScreen({ initial_as_of }: { initial_as_of?: string }) {
  const [as_of, set_as_of] = React.useState(initial_as_of ?? today_iso());
  const overview = useQuery({ queryKey: query_keys.overview(as_of), queryFn: () => api.overview(as_of) });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Overview</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">How ACME pays</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current annual base pay for active and on-leave employees, as of the selected date.
          </p>
        </div>
        <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-3 shadow-card">
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
      <CardHeader className="border-b pb-4">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{definition}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function StatCard({
  icon: IconComponent,
  tone,
  question,
  value,
  footnote,
  children,
  value_testid,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  tone: string;
  question: string;
  value: string;
  footnote: string;
  children?: React.ReactNode;
  value_testid?: string;
}) {
  return (
    <TiltCard className="h-full">
      <div className="flex h-full flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-sm font-medium leading-snug text-muted-foreground">{question}</h2>
          <span
            className={`grid size-9 shrink-0 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110 ${tone}`}
          >
            <IconComponent className="size-[18px]" />
          </span>
        </div>
        <p className="text-2xl font-semibold tracking-tight tabular-nums xl:text-[1.7rem]" data-testid={value_testid}>
          {value}
        </p>
        {children}
        <p className="mt-auto text-xs leading-relaxed text-muted-foreground">{footnote}</p>
      </div>
    </TiltCard>
  );
}

function OverviewBody({ data }: { data: Overview }) {
  return (
    <>
      <p className="-mt-2 text-sm text-muted-foreground" aria-live="polite">
        Figures as of {data.as_of}.
      </p>
      <section aria-label="Key figures" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={UsersIcon}
          tone="bg-blue-50 text-blue-700"
          question="How many people are we paying?"
          value={`${format_count(data.headcount)} people`}
          value_testid="headcount"
          footnote="Active and on leave, as of the selected date."
        />
        <StatCard
          icon={BanknoteIcon}
          tone="bg-emerald-50 text-emerald-700"
          question="What is payroll in USD?"
          value={format_money(data.usd.total_minor, 'USD')}
          footnote="Snapshot conversion of every current annual base into USD."
        >
          <p className="text-xs font-medium text-emerald-800">
            {data.usd.label || 'USD snapshot'} · rates as of {data.usd.rate_as_of}
          </p>
        </StatCard>
        <StatCard
          icon={TrendIcon}
          tone="bg-violet-50 text-violet-700"
          question="What does a typical employee earn?"
          value={format_money(data.usd.median_minor, 'USD')}
          footnote="Median is typical pay. Average is pulled up by senior levels."
        >
          <p className="text-xs font-medium text-violet-800">Median · USD snapshot</p>
        </StatCard>
        <StatCard
          icon={BarsIcon}
          tone="bg-amber-50 text-amber-700"
          question="And the average?"
          value={format_money(data.usd.average_minor, 'USD')}
          footnote="Per-currency median and average are in the payroll table below."
        >
          <p className="text-xs font-medium text-amber-800">Average · USD snapshot</p>
        </StatCard>
      </section>

      <Question title="What is payroll in each currency?" definition="Sum of current annual base. No conversion.">
        <CurrencyTable rows={data.by_currency} total_headcount={data.headcount} caption="Payroll by contract currency" />
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

function CurrencyTable({
  rows,
  total_headcount,
  caption,
}: {
  rows: CurrencyStats[];
  total_headcount: number;
  caption: string;
}) {
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
            <TableCell className="text-right tabular-nums">
              {format_count(row.headcount)}
              <span aria-hidden="true" className="ml-auto mt-1.5 block h-1 w-24 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary/60"
                  style={{ width: `${total_headcount > 0 ? (row.headcount / total_headcount) * 100 : 0}%` }}
                />
              </span>
            </TableCell>
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
                        <Link
                          href={group.href}
                          className="text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
                        >
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
