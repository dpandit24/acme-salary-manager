// Deterministic seed data. Same PRNG seed -> same 10,000 people, same pay, same history.
import { CompensationReason, EmploymentStatus, LEVELS, default_currency_for } from '../src/common/reference_data';

export const SEED_REFERENCE_DATE = '2026-10-01';
export const FX_SNAPSHOT_AS_OF = '2026-10-01';

/** USD major units per 1 major unit of the currency, times 1,000,000. */
export const FX_RATES_PPM: Record<string, number> = {
  USD: 1_000_000,
  EUR: 1_080_000,
  GBP: 1_270_000,
  INR: 12_000,
  SGD: 740_000,
  AED: 272_294,
  CAD: 730_000,
  AUD: 650_000,
};

/** Annual base midpoint in local major units, by country and level (IC1..IC6, M1..M3). */
export const PAY_BANDS: Record<string, number[]> = {
  US: [85_000, 105_000, 130_000, 160_000, 195_000, 240_000, 175_000, 215_000, 270_000],
  DE: [52_000, 62_000, 75_000, 90_000, 108_000, 130_000, 100_000, 120_000, 150_000],
  GB: [42_000, 52_000, 65_000, 80_000, 98_000, 120_000, 90_000, 110_000, 140_000],
  IN: [900_000, 1_400_000, 2_200_000, 3_200_000, 4_500_000, 6_200_000, 4_000_000, 5_500_000, 7_500_000],
  SG: [60_000, 78_000, 100_000, 125_000, 155_000, 190_000, 140_000, 175_000, 220_000],
  AE: [180_000, 240_000, 300_000, 380_000, 470_000, 580_000, 420_000, 520_000, 660_000],
  CA: [70_000, 85_000, 105_000, 128_000, 155_000, 190_000, 140_000, 170_000, 215_000],
  AU: [80_000, 98_000, 120_000, 145_000, 175_000, 210_000, 160_000, 195_000, 245_000],
};

const COUNTRY_WEIGHTS: [string, number][] = [
  ['US', 30], ['IN', 25], ['GB', 10], ['DE', 10], ['CA', 8], ['SG', 6], ['AU', 6], ['AE', 5],
];
const LEVEL_WEIGHTS: [string, number][] = [
  ['IC1', 10], ['IC2', 18], ['IC3', 22], ['IC4', 18], ['IC5', 10], ['IC6', 4], ['M1', 9], ['M2', 6], ['M3', 3],
];
const DEPARTMENT_ROLES: [string, number, string][] = [
  ['Engineering', 30, 'Software Engineer'],
  ['Sales', 14, 'Account Executive'],
  ['Operations', 11, 'Operations Specialist'],
  ['Customer Success', 10, 'Customer Success Manager'],
  ['Product', 8, 'Product Manager'],
  ['Marketing', 8, 'Marketing Specialist'],
  ['Finance', 6, 'Financial Analyst'],
  ['Design', 5, 'Product Designer'],
  ['People', 5, 'People Partner'],
  ['Legal', 3, 'Counsel'],
];
const IC_PREFIX: Record<string, string> = { IC1: 'Associate ', IC2: '', IC3: '', IC4: 'Senior ', IC5: 'Staff ', IC6: 'Principal ' };
const MANAGER_TITLE: Record<string, string> = { M1: 'Manager', M2: 'Senior Manager', M3: 'Director' };

// 120 x 100 = 12,000 distinct pairs, so 10,000 employees can each get a unique full name.
const FIRST_NAMES = [
  'Aarav', 'Aditi', 'Akash', 'Ananya', 'Anika', 'Arjun', 'Aryan', 'Deepak', 'Divya', 'Gaurav', 'Isha', 'Ishaan',
  'Kabir', 'Kavya', 'Meera', 'Neha', 'Nikhil', 'Pooja', 'Priya', 'Rahul', 'Riya', 'Rohan', 'Sanjay', 'Shreya',
  'Sneha', 'Tanvi', 'Varun', 'Vikram', 'Vivek', 'Zara', 'Alex', 'Amelia', 'Ava', 'Ben', 'Charlotte', 'Chloe',
  'Daniel', 'Emily', 'Emma', 'Ethan', 'Grace', 'Hannah', 'Harry', 'Isla', 'Jack', 'James', 'Jessica', 'Liam',
  'Lily', 'Lucy', 'Mason', 'Mia', 'Noah', 'Oliver', 'Olivia', 'Ryan', 'Sam', 'Sophie', 'Thomas', 'William',
  'Anna', 'Felix', 'Finn', 'Clara', 'Jonas', 'Julia', 'Lena', 'Leon', 'Lukas', 'Marie', 'Maximilian', 'Paul',
  'Greta', 'Tim', 'Paula', 'Aisha', 'Fatima', 'Hassan', 'Khalid', 'Layla', 'Mariam', 'Mohammed', 'Noor', 'Omar',
  'Rania', 'Salma', 'Tariq', 'Yusuf', 'Zaid', 'Hamza', 'Mei', 'Wei', 'Jun', 'Lina', 'Xin', 'Hao', 'Ying', 'Kai',
  'Hiro', 'Yuki', 'Minho', 'Jisoo', 'Huimin', 'Jiahui', 'Darren', 'Carlos', 'Diego', 'Elena', 'Gabriel', 'Isabella',
  'Lucas', 'Mateo', 'Nora', 'Sara', 'Sofia', 'Valentina', 'Zoe', 'Ines', 'Marco', 'Nina',
];
const LAST_NAMES = [
  'Agarwal', 'Bhatt', 'Chopra', 'Das', 'Desai', 'Gupta', 'Iyer', 'Joshi', 'Kapoor', 'Kumar', 'Malhotra', 'Mehta',
  'Menon', 'Mishra', 'Nair', 'Pandey', 'Patel', 'Pillai', 'Rao', 'Reddy', 'Saxena', 'Shah', 'Sharma', 'Singh', 'Verma',
  'Brown', 'Clarke', 'Davies', 'Evans', 'Green', 'Hall', 'Harris', 'Hughes', 'Jackson', 'Jones', 'King', 'Lewis',
  'Miller', 'Moore', 'Robinson', 'Smith', 'Taylor', 'Thompson', 'Walker', 'White', 'Williams', 'Wilson', 'Wright',
  'Young', 'Campbell', 'Bauer', 'Becker', 'Fischer', 'Hoffmann', 'Koch', 'Meyer', 'Muller', 'Richter', 'Schmidt',
  'Schneider', 'Schulz', 'Wagner', 'Weber', 'Wolf', 'Zimmermann', 'Ahmed', 'Ali', 'Haddad', 'Hussein', 'Ibrahim',
  'Khan', 'Mansour', 'Nasser', 'Rahman', 'Saleh', 'Hamdan', 'Chen', 'Huang', 'Lee', 'Lim', 'Liu', 'Ng', 'Ong', 'Tan',
  'Wang', 'Wong', 'Zhang', 'Kim', 'Park', 'Sato', 'Tanaka', 'Garcia', 'Lopez', 'Martin', 'Rossi', 'Silva', 'Nguyen',
  'Costa', 'Novak', 'Dubois', 'Fernandes',
];

export interface SeedEmployee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department: string;
  job_title: string;
  level: string;
  status: EmploymentStatus;
  hire_date: string;
}

export interface SeedCompensation {
  employee_id: string;
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: CompensationReason;
  note: string | null;
}

export interface SeedData {
  employees: SeedEmployee[];
  compensations: SeedCompensation[];
}

/** mulberry32: small, fast, deterministic. */
export function create_prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generate_seed_data(count = 10_000, prng_seed = 20261001): SeedData {
  const random = create_prng(prng_seed);
  const weighted = <T extends [string, number, ...unknown[]]>(items: readonly T[]): T => {
    const total = items.reduce((sum, item) => sum + item[1], 0);
    let roll = random() * total;
    for (const item of items) if ((roll -= item[1]) < 0) return item;
    return items[items.length - 1];
  };
  const uuid = (): string => {
    const hex = Array.from({ length: 32 }, () => Math.floor(random() * 16).toString(16));
    hex[12] = '4';
    hex[16] = '89ab'[Math.floor(random() * 4)];
    const s = hex.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
  };

  const reference_day = to_day(SEED_REFERENCE_DATE);
  const first_hire_day = to_day('2014-01-01');
  const employees: SeedEmployee[] = [];
  const compensations: SeedCompensation[] = [];

  // Shuffle every first/last pair and deal them out in order, so names only repeat past 12,000 people.
  const name_pairs = FIRST_NAMES.flatMap((first) => LAST_NAMES.map((last): [string, string] => [first, last]));
  for (let i = name_pairs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [name_pairs[i], name_pairs[j]] = [name_pairs[j], name_pairs[i]];
  }

  for (let index = 0; index < count; index++) {
    const id = uuid();
    const employee_number = `ACME-${10_001 + index}`;
    const [first_name, last_name] = name_pairs[index % name_pairs.length];
    const [country_code] = weighted(COUNTRY_WEIGHTS);
    const [level] = weighted(LEVEL_WEIGHTS);
    const [department, , role] = weighted(DEPARTMENT_ROLES);
    const job_title = level.startsWith('M') ? `${MANAGER_TITLE[level]}, ${department}` : `${IC_PREFIX[level]}${role}`;
    const hire_day = first_hire_day + Math.floor(random() * (reference_day - 30 - first_hire_day));
    const status_roll = random();
    const status: EmploymentStatus = status_roll < 0.03 ? 'terminated' : status_roll < 0.05 ? 'on_leave' : 'active';

    employees.push({
      id,
      employee_number,
      first_name,
      last_name,
      email: `${first_name}.${last_name}.${10_001 + index}@acme.example`.toLowerCase(),
      country_code,
      department,
      job_title,
      level,
      status,
      hire_date: from_day(hire_day),
    });

    // Salary is explainable from country + level: band midpoint with a deterministic +/-8% jitter, rounded to 100.
    const currency = default_currency_for(country_code)!;
    const midpoint = PAY_BANDS[country_code][LEVELS.indexOf(level)];
    const current_major = round_to(midpoint * (0.92 + random() * 0.16), 100);

    const has_history = random() < 0.2 && reference_day - hire_day > 365;
    if (has_history) {
      const change_day = hire_day + 180 + Math.floor(random() * (reference_day - hire_day - 180));
      const reason: CompensationReason = random() < 0.5 ? 'promotion' : 'merit';
      const hire_major = round_to(current_major * (0.85 + random() * 0.08), 100);
      compensations.push({ employee_id: id, effective_from: from_day(hire_day), amount_minor: hire_major * 100, currency, reason: 'hire', note: null });
      compensations.push({ employee_id: id, effective_from: from_day(change_day), amount_minor: current_major * 100, currency, reason, note: null });
    } else {
      compensations.push({ employee_id: id, effective_from: from_day(hire_day), amount_minor: current_major * 100, currency, reason: 'hire', note: null });
    }
  }

  return { employees, compensations };
}

function round_to(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function to_day(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

function from_day(day: number): string {
  return new Date(day * 86_400_000).toISOString().slice(0, 10);
}
