import { Injectable } from '@nestjs/common';
import { today_utc } from '../../common/dates';
import { PayStats, pay_stats } from '../../common/money';
import { LEVELS } from '../../common/reference_data';
import { CompensationsService } from '../compensations/compensations.service';
import { EmployeesService } from '../employees/employees.service';
import { FxRatesService } from '../fx_rates/fx_rates.service';

export const USD_SNAPSHOT_LABEL = 'USD snapshot';

export interface CurrencyStats extends PayStats {
  currency: string;
  headcount: number;
}

export interface GroupStats {
  headcount: number;
  by_currency: CurrencyStats[];
  usd: PayStats;
}

export interface Overview {
  as_of: string;
  headcount: number;
  by_currency: CurrencyStats[];
  usd: PayStats & { rate_as_of: string | null; label: string };
  by_country: (GroupStats & { country_code: string })[];
  by_department: (GroupStats & { department: string })[];
  by_level: (GroupStats & { level: string })[];
}

interface PaidMember {
  country_code: string;
  department: string;
  level: string;
  amount_minor: number;
  currency: string;
  amount_usd_minor: number;
}

/**
 * Composes the "how we pay" answer from EmployeesService (who is on payroll) and CompensationsService
 * (current pay in local currency and USD). No repository, no SQL: see the cross-module rule in backend.md.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly employees_service: EmployeesService,
    private readonly compensations_service: CompensationsService,
    private readonly fx_rates_service: FxRatesService,
  ) {}

  async overview(as_of = today_utc()): Promise<Overview> {
    const [population, current_pay, snapshot] = await Promise.all([
      this.employees_service.list_payroll_population(),
      this.compensations_service.get_current_compensations(as_of),
      this.fx_rates_service.get_snapshot(),
    ]);

    // Someone with no effective row on as_of (hired in the future) is not yet on payroll.
    const paid: PaidMember[] = [];
    for (const member of population) {
      const pay = current_pay.get(member.id);
      if (pay) paid.push({ ...member, amount_minor: pay.amount_minor, currency: pay.currency, amount_usd_minor: pay.amount_usd_minor });
    }

    const overall = group_stats(paid);
    return {
      as_of,
      headcount: overall.headcount,
      by_currency: overall.by_currency,
      usd: { ...overall.usd, rate_as_of: snapshot.as_of, label: USD_SNAPSHOT_LABEL },
      by_country: group_by(paid, 'country_code', compare_text).map(([country_code, stats]) => ({ country_code, ...stats })),
      by_department: group_by(paid, 'department', compare_text).map(([department, stats]) => ({ department, ...stats })),
      by_level: group_by(paid, 'level', compare_level).map(([level, stats]) => ({ level, ...stats })),
    };
  }
}

export function group_stats(members: readonly PaidMember[]): GroupStats {
  const by_currency = new Map<string, number[]>();
  for (const member of members) {
    const amounts = by_currency.get(member.currency) ?? [];
    amounts.push(member.amount_minor);
    by_currency.set(member.currency, amounts);
  }
  return {
    headcount: members.length,
    // Each currency is summarised on its own; two currencies are never added together.
    by_currency: [...by_currency.entries()]
      .sort(([a], [b]) => compare_text(a, b))
      .map(([currency, amounts]) => ({ currency, headcount: amounts.length, ...pay_stats(amounts) })),
    usd: pay_stats(members.map((member) => member.amount_usd_minor)),
  };
}

function group_by(
  members: readonly PaidMember[],
  key: 'country_code' | 'department' | 'level',
  compare: (a: string, b: string) => number,
): [string, GroupStats][] {
  const groups = new Map<string, PaidMember[]>();
  for (const member of members) {
    const group = groups.get(member[key]) ?? [];
    group.push(member);
    groups.set(member[key], group);
  }
  return [...groups.entries()].sort(([a], [b]) => compare(a, b)).map(([value, group]) => [value, group_stats(group)]);
}

function compare_text(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function compare_level(a: string, b: string): number {
  return LEVELS.indexOf(a) - LEVELS.indexOf(b);
}
