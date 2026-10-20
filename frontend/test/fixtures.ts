import type {
  Compensation,
  EmployeeDetail,
  EmployeeListItem,
  EmployeeListResponse,
  HrUser,
  Meta,
  Overview,
} from '@/lib/api/types';

export const me_fixture: HrUser = { id: 'u-1', email: 'hr@acme.test' };

export const meta_fixture: Meta = {
  countries: [
    { code: 'US', name: 'United States', default_currency: 'USD' },
    { code: 'IN', name: 'India', default_currency: 'INR' },
    { code: 'DE', name: 'Germany', default_currency: 'EUR' },
  ],
  departments: ['Engineering', 'Finance', 'Sales'],
  levels: ['IC1', 'IC2', 'IC3', 'IC4', 'IC5', 'IC6', 'M1', 'M2', 'M3'],
  currencies: ['USD', 'INR', 'EUR'],
  reasons: ['hire', 'merit', 'promotion', 'market_adjustment', 'correction'],
  fx_rates_as_of: '2026-10-01',
};

export const overview_fixture: Overview = {
  as_of: '2026-10-20',
  headcount: 9500,
  by_currency: [
    { currency: 'INR', headcount: 2100, total_minor: 525000000000, average_minor: 250000000, median_minor: 210000000 },
    { currency: 'USD', headcount: 7400, total_minor: 111000000000, average_minor: 15000000, median_minor: 13250000 },
  ],
  usd: {
    total_minor: 117300000000,
    average_minor: 12347368,
    median_minor: 11800000,
    rate_as_of: '2026-10-01',
    label: 'USD snapshot',
  },
  by_country: [
    {
      country_code: 'IN',
      headcount: 2100,
      by_currency: [
        { currency: 'INR', headcount: 2099, total_minor: 524000000000, average_minor: 249642687, median_minor: 210000000 },
        { currency: 'USD', headcount: 1, total_minor: 20000000, average_minor: 20000000, median_minor: 20000000 },
      ],
      usd: { total_minor: 6488000000, average_minor: 3089524, median_minor: 2520000 },
    },
  ],
  by_department: [
    {
      department: 'Engineering',
      headcount: 3000,
      by_currency: [{ currency: 'USD', headcount: 3000, total_minor: 51000000000, average_minor: 17000000, median_minor: 16000000 }],
      usd: { total_minor: 51000000000, average_minor: 17000000, median_minor: 16000000 },
    },
  ],
  by_level: [
    {
      level: 'IC3',
      headcount: 1800,
      by_currency: [{ currency: 'USD', headcount: 1800, total_minor: 21600000000, average_minor: 12000000, median_minor: 11500000 }],
      usd: { total_minor: 21600000000, average_minor: 12000000, median_minor: 11500000 },
    },
  ],
};

export const overview_future_fixture: Overview = {
  ...overview_fixture,
  as_of: '2027-01-15',
  headcount: 9600,
  by_currency: [
    { currency: 'INR', headcount: 2150, total_minor: 600000000000, average_minor: 279069767, median_minor: 230000000 },
    { currency: 'USD', headcount: 7450, total_minor: 115000000000, average_minor: 15436241, median_minor: 13900000 },
  ],
  usd: { ...overview_fixture.usd, total_minor: 122200000000 },
};

function list_item(index: number): EmployeeListItem {
  const n = 10001 + index;
  const in_india = index % 2 === 1;
  return {
    id: `emp-${n}`,
    employee_number: `ACME-${n}`,
    first_name: `First${n}`,
    last_name: `Last${n}`,
    email: `person${n}@acme.test`,
    country_code: in_india ? 'IN' : 'US',
    department: 'Engineering',
    job_title: 'Engineer',
    level: 'IC3',
    status: 'active',
    hire_date: '2022-03-01',
    amount_minor: in_india ? 250000000 : 12000000 + index,
    currency: in_india ? 'INR' : 'USD',
    amount_usd_minor: in_india ? 3000000 : 12000000 + index,
    effective_from: '2022-03-01',
  };
}

export function list_page_fixture(page = 1, total = 9840): EmployeeListResponse {
  const items = Array.from({ length: 25 }, (_, i) => list_item((page - 1) * 25 + i));
  items[2] = { ...items[2]!, amount_minor: null, currency: null, amount_usd_minor: null, effective_from: null };
  return { items, page, page_size: 25, total };
}

export const empty_list_fixture: EmployeeListResponse = { items: [], page: 1, page_size: 25, total: 0 };

const hire_row: Compensation = {
  id: 'comp-1',
  employee_id: 'emp-10001',
  effective_from: '2022-03-01',
  amount_minor: 11000000,
  currency: 'USD',
  reason: 'hire',
  note: null,
  amount_usd_minor: 11000000,
  created_at: '2022-03-01T00:00:00Z',
  updated_at: '2022-03-01T00:00:00Z',
};

const merit_row: Compensation = {
  ...hire_row,
  id: 'comp-2',
  effective_from: '2024-04-01',
  amount_minor: 12000000,
  reason: 'merit',
  note: 'Annual review',
  amount_usd_minor: 12000000,
};

export const employee_detail_fixture: EmployeeDetail = {
  id: 'emp-10001',
  employee_number: 'ACME-10001',
  first_name: 'Ada',
  last_name: 'Lovelace',
  email: 'ada@acme.test',
  country_code: 'US',
  department: 'Engineering',
  job_title: 'Staff Engineer',
  level: 'IC5',
  status: 'active',
  hire_date: '2022-03-01',
  created_at: '2022-03-01T00:00:00Z',
  updated_at: '2024-04-01T00:00:00Z',
  current_compensation: merit_row,
  compensations: [hire_row, merit_row],
};
