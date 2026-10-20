export type EmployeeStatus = 'active' | 'on_leave' | 'terminated';
export type StatusFilter = EmployeeStatus | 'all';
export type CompensationReason = 'hire' | 'merit' | 'promotion' | 'market_adjustment' | 'correction';
export type ChangeReason = 'merit' | 'promotion' | 'market_adjustment';
export type SortField = 'name' | 'hire_date' | 'salary';
export type SortDirection = 'asc' | 'desc';

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface HrUser {
  id: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Country {
  code: string;
  name: string;
  default_currency: string;
}

export interface Meta {
  countries: Country[];
  departments: string[];
  levels: string[];
  currencies: string[];
  reasons: CompensationReason[];
  fx_rates_as_of: string;
}

export interface Employee {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department: string;
  job_title: string;
  level: string;
  status: EmployeeStatus;
  hire_date: string;
  created_at: string;
  updated_at: string;
}

export interface Compensation {
  id: string;
  employee_id: string;
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: CompensationReason;
  note: string | null;
  amount_usd_minor: number;
  created_at: string;
  updated_at: string;
}

export interface EmployeeListItem {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department: string;
  job_title: string;
  level: string;
  status: EmployeeStatus;
  hire_date: string;
  amount_minor: number | null;
  currency: string | null;
  amount_usd_minor: number | null;
  effective_from: string | null;
}

export interface EmployeeListResponse {
  items: EmployeeListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface EmployeeListQuery {
  q?: string;
  country_code?: string;
  department?: string;
  level?: string;
  status?: StatusFilter;
  page?: number;
  page_size?: number;
  sort?: SortField;
  direction?: SortDirection;
  as_of?: string;
}

export interface EmployeeDetail extends Employee {
  current_compensation: Compensation | null;
  compensations: Compensation[];
}

export interface CreateEmployeeRequest {
  employee_number: string;
  first_name: string;
  last_name: string;
  email: string;
  country_code: string;
  department: string;
  job_title: string;
  level: string;
  hire_date: string;
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: 'hire';
}

export interface UpdateEmployeeRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  country_code?: string;
  department?: string;
  job_title?: string;
  level?: string;
  status?: EmployeeStatus;
  hire_date?: string;
}

export interface CreateCompensationRequest {
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: ChangeReason;
  note?: string | null;
}

export interface CorrectCompensationRequest {
  effective_from: string;
  amount_minor: number;
  currency: string;
  reason: 'correction';
  note?: string | null;
}

export interface CurrencyStats {
  currency: string;
  headcount: number;
  total_minor: number;
  average_minor: number;
  median_minor: number;
}

export interface UsdStats {
  total_minor: number;
  average_minor: number;
  median_minor: number;
}

export interface UsdSnapshot extends UsdStats {
  rate_as_of: string;
  label: string;
}

interface GroupBase {
  headcount: number;
  by_currency: CurrencyStats[];
  usd: UsdStats;
}

export interface CountryGroup extends GroupBase {
  country_code: string;
}

export interface DepartmentGroup extends GroupBase {
  department: string;
}

export interface LevelGroup extends GroupBase {
  level: string;
}

export interface Overview {
  as_of: string;
  headcount: number;
  by_currency: CurrencyStats[];
  usd: UsdSnapshot;
  by_country: CountryGroup[];
  by_department: DepartmentGroup[];
  by_level: LevelGroup[];
}
