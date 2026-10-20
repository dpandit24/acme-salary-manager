import { CompensationsService } from '../compensations/compensations.service';
import { CompensationView } from '../compensations/dto/compensation_view';
import { EmployeesService } from '../employees/employees.service';
import { FxRatesService, FxSnapshot } from '../fx_rates/fx_rates.service';
import { AnalyticsService } from './analytics.service';

function pay(employee_id: string, amount_minor: number, currency: string, amount_usd_minor: number): CompensationView {
  return {
    id: `c-${employee_id}`,
    employee_id,
    effective_from: '2025-01-01',
    amount_minor,
    currency,
    reason: 'hire',
    note: null,
    amount_usd_minor,
    created_at: new Date(0),
    updated_at: new Date(0),
  };
}

describe('AnalyticsService', () => {
  // Cross-module dependencies are mocked at the service interface (backend.md, cross-module rule 7).
  // The population stub only ever contains active and on-leave people: EmployeesService owns that rule.
  const employees_service = {
    list_payroll_population: jest.fn().mockResolvedValue([
      { id: 'us-1', country_code: 'US', department: 'Engineering', level: 'IC3' },
      { id: 'us-2', country_code: 'US', department: 'Sales', level: 'M1' },
      { id: 'in-1', country_code: 'IN', department: 'Engineering', level: 'IC3' },
      { id: 'in-expat', country_code: 'IN', department: 'Engineering', level: 'M2' },
      { id: 'future-hire', country_code: 'US', department: 'Sales', level: 'IC1' },
    ]),
  } as unknown as EmployeesService;

  const compensations_service = {
    get_current_compensations: jest.fn().mockResolvedValue(
      new Map([
        ['us-1', pay('us-1', 10_000_000, 'USD', 10_000_000)],
        ['us-2', pay('us-2', 20_000_001, 'USD', 20_000_001)],
        ['in-1', pay('in-1', 300_000_000, 'INR', 3_600_000)],
        ['in-expat', pay('in-expat', 15_000_000, 'USD', 15_000_000)],
      ]),
    ),
  } as unknown as CompensationsService;

  const fx_rates_service = {
    get_snapshot: jest.fn().mockResolvedValue(new FxSnapshot(new Map(), '2026-10-01')),
  } as unknown as FxRatesService;

  const service = new AnalyticsService(employees_service, compensations_service, fx_rates_service);

  it('excludes people with no effective pay and never adds two currencies in by_currency', async () => {
    const overview = await service.overview('2026-10-20');
    expect(overview.headcount).toBe(4);
    expect(overview.by_currency).toEqual([
      { currency: 'INR', headcount: 1, total_minor: 300_000_000, average_minor: 300_000_000, median_minor: 300_000_000 },
      { currency: 'USD', headcount: 3, total_minor: 45_000_001, average_minor: 15_000_000, median_minor: 15_000_000 },
    ]);
  });

  it('combines currencies only in the labeled USD snapshot', async () => {
    const overview = await service.overview('2026-10-20');
    expect(overview.usd).toEqual({
      total_minor: 48_600_001,
      average_minor: 12_150_000,
      median_minor: 12_500_000,
      rate_as_of: '2026-10-01',
      label: 'USD snapshot',
    });
  });

  it('breaks a country out by currency when contracts differ', async () => {
    const overview = await service.overview('2026-10-20');
    const india = overview.by_country.find((group) => group.country_code === 'IN')!;
    expect(india.headcount).toBe(2);
    expect(india.by_currency.map((entry) => entry.currency)).toEqual(['INR', 'USD']);
    expect(india.usd.total_minor).toBe(18_600_000);
  });

  it('orders levels IC before M', async () => {
    const overview = await service.overview('2026-10-20');
    expect(overview.by_level.map((group) => group.level)).toEqual(['IC3', 'M1', 'M2']);
  });
});
