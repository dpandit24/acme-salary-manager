import { QueryFailedError } from 'typeorm';
import { ApiError } from '../../common/api_error';
import { FxRatesService, FxSnapshot } from '../fx_rates/fx_rates.service';
import { select_current } from './compensation_rules';
import { CompensationsRepository } from './compensations.repository';
import { CompensationsService } from './compensations.service';
import { Compensation } from './entities/compensation.entity';

const EMPLOYEE_ID = '11111111-1111-4111-8111-111111111111';

function row(effective_from: string, amount_minor: number, currency = 'USD'): Compensation {
  return Object.assign(new Compensation(), {
    id: `c-${effective_from}`,
    employee_id: EMPLOYEE_ID,
    effective_from,
    amount_minor,
    currency,
    reason: 'merit',
    note: null,
    created_at: new Date(0),
    updated_at: new Date(0),
  });
}

function pg_error(code: string, constraint: string): QueryFailedError {
  return new QueryFailedError('INSERT', [], Object.assign(new Error('pg'), { code, constraint }));
}

describe('select_current (salary rule 5)', () => {
  const history = [row('2024-01-01', 100), row('2025-01-01', 200), row('2026-12-01', 300)];

  it('picks the latest past row', () => {
    expect(select_current(history, '2025-06-30')?.amount_minor).toBe(200);
  });

  it('includes a row effective today', () => {
    expect(select_current(history, '2025-01-01')?.amount_minor).toBe(200);
  });

  it('ignores a future row until as_of reaches it', () => {
    expect(select_current(history, '2026-11-30')?.amount_minor).toBe(200);
    expect(select_current(history, '2026-12-01')?.amount_minor).toBe(300);
  });

  it('returns null for a person with no row yet', () => {
    expect(select_current(history, '2023-12-31')).toBeNull();
    expect(select_current([], '2025-01-01')).toBeNull();
  });
});

describe('CompensationsService', () => {
  let repository: jest.Mocked<Pick<CompensationsRepository, 'insert' | 'save' | 'find_one_for_employee' | 'find_for_employee' | 'find_current'>>;
  let service: CompensationsService;

  beforeEach(() => {
    repository = {
      insert: jest.fn(),
      save: jest.fn(),
      find_one_for_employee: jest.fn(),
      find_for_employee: jest.fn(),
      find_current: jest.fn(),
    };
    const fx_rates_service = {
      get_snapshot: jest.fn().mockResolvedValue(new FxSnapshot(new Map([['USD', 1_000_000], ['INR', 12_000]]), '2026-10-01')),
    } as unknown as FxRatesService;
    service = new CompensationsService(repository as unknown as CompensationsRepository, fx_rates_service);
  });

  it('returns 409 on the effective_from field for a duplicate date', async () => {
    repository.insert.mockRejectedValue(pg_error('23505', 'uq_compensations_employee_id_effective_from'));
    const result = service.create(EMPLOYEE_ID, { effective_from: '2025-01-01', amount_minor: 1, currency: 'USD', reason: 'merit' });
    await expect(result).rejects.toMatchObject({ code: 'CONFLICT', fields: { effective_from: expect.any(String) } });
  });

  it('returns 404 when the employee does not exist', async () => {
    repository.insert.mockRejectedValue(pg_error('23503', 'fk_compensations_employees'));
    const result = service.create(EMPLOYEE_ID, { effective_from: '2025-01-01', amount_minor: 1, currency: 'USD', reason: 'merit' });
    await expect(result).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('correction path rejects a non-correction reason', async () => {
    const result = service.correct(EMPLOYEE_ID, 'c-1', { reason: 'merit', amount_minor: 5 });
    await expect(result).rejects.toBeInstanceOf(ApiError);
    await expect(result).rejects.toMatchObject({ code: 'VALIDATION', fields: { reason: 'must be correction' } });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('correction rewrites the row in place', async () => {
    const existing = row('2025-01-01', 100);
    repository.find_one_for_employee.mockResolvedValue(existing);
    repository.save.mockImplementation(async (saved) => saved);
    const result = await service.correct(EMPLOYEE_ID, existing.id, { reason: 'correction', amount_minor: 150 });
    expect(result).toMatchObject({ id: existing.id, amount_minor: 150, reason: 'correction', amount_usd_minor: 150 });
    expect(repository.insert).not.toHaveBeenCalled();
  });

  it('converts current pay to USD with the snapshot', async () => {
    repository.find_current.mockResolvedValue([row('2025-01-01', 100_000_000, 'INR')]);
    const current = await service.get_current_compensations('2025-06-01');
    expect(current.get(EMPLOYEE_ID)?.amount_usd_minor).toBe(1_200_000);
  });

  it('detail returns history oldest first plus the current row', async () => {
    repository.find_for_employee.mockResolvedValue([row('2024-01-01', 100), row('2027-01-01', 300)]);
    const result = await service.get_for_employee(EMPLOYEE_ID, '2026-10-20');
    expect(result.compensations.map((c) => c.amount_minor)).toEqual([100, 300]);
    expect(result.current_compensation?.amount_minor).toBe(100);
  });
});
