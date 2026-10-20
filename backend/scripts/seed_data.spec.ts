import { COUNTRY_CODES, LEVELS, default_currency_for } from '../src/common/reference_data';
import { FX_RATES_PPM, SEED_REFERENCE_DATE, generate_seed_data } from './seed_data';

describe('seed data', () => {
  const data = generate_seed_data();

  it('creates exactly 10,000 employees numbered ACME-10001 to ACME-20000', () => {
    expect(data.employees).toHaveLength(10_000);
    expect(data.employees[0].employee_number).toBe('ACME-10001');
    expect(data.employees[9_999].employee_number).toBe('ACME-20000');
    expect(new Set(data.employees.map((employee) => employee.email)).size).toBe(10_000);
    expect(new Set(data.employees.map((employee) => employee.id)).size).toBe(10_000);
    expect(new Set(data.employees.map((employee) => `${employee.first_name} ${employee.last_name}`)).size).toBe(10_000);
  });

  it('is deterministic', () => {
    expect(generate_seed_data(50)).toEqual(generate_seed_data(50));
  });

  it('covers all eight countries and nine levels, and every currency has a rate', () => {
    expect(new Set(data.employees.map((employee) => employee.country_code))).toEqual(new Set(COUNTRY_CODES));
    expect(new Set(data.employees.map((employee) => employee.level))).toEqual(new Set(LEVELS));
    for (const compensation of data.compensations) expect(FX_RATES_PPM[compensation.currency]).toBeDefined();
  });

  it('gives everyone a hire row in the country currency, on the hire date', () => {
    const employees = new Map(data.employees.map((employee) => [employee.id, employee]));
    const hire_rows = data.compensations.filter((row) => row.reason === 'hire');
    expect(hire_rows).toHaveLength(10_000);
    for (const row of hire_rows) {
      const employee = employees.get(row.employee_id)!;
      expect(row.currency).toBe(default_currency_for(employee.country_code));
      expect(row.effective_from).toBe(employee.hire_date);
    }
  });

  it('gives about 20% a later change that is the current row, never after the reference date', () => {
    const changes = data.compensations.filter((row) => row.reason !== 'hire');
    expect(changes.length / 10_000).toBeGreaterThan(0.15);
    expect(changes.length / 10_000).toBeLessThan(0.22);
    const hire_by_employee = new Map(data.compensations.filter((row) => row.reason === 'hire').map((row) => [row.employee_id, row]));
    for (const change of changes) {
      const hire = hire_by_employee.get(change.employee_id)!;
      expect(change.effective_from > hire.effective_from).toBe(true);
      expect(change.effective_from <= SEED_REFERENCE_DATE).toBe(true);
    }
  });

  it('has about 3% terminated and 2% on leave', () => {
    const count = (status: string) => data.employees.filter((employee) => employee.status === status).length / 10_000;
    expect(count('terminated')).toBeGreaterThan(0.02);
    expect(count('terminated')).toBeLessThan(0.04);
    expect(count('on_leave')).toBeGreaterThan(0.01);
    expect(count('on_leave')).toBeLessThan(0.03);
  });

  it('only produces positive integer amounts', () => {
    for (const row of data.compensations) expect(Number.isSafeInteger(row.amount_minor) && row.amount_minor > 0).toBe(true);
  });
});
