import { api_fetch } from './client';
import type {
  Compensation,
  CorrectCompensationRequest,
  CreateCompensationRequest,
  CreateEmployeeRequest,
  Employee,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  HrUser,
  LoginRequest,
  Meta,
  Overview,
  UpdateEmployeeRequest,
} from './types';

const BASE = '/api/v1';

function employee_path(id: string): string {
  return `${BASE}/employees/${encodeURIComponent(id)}`;
}

export const api = {
  login: (body: LoginRequest) =>
    api_fetch<unknown>(`${BASE}/auth/login`, { method: 'POST', body, skip_auth_redirect: true }),
  logout: () => api_fetch<unknown>(`${BASE}/auth/logout`, { method: 'POST', skip_auth_redirect: true }),
  me: () => api_fetch<HrUser>(`${BASE}/auth/me`, { skip_auth_redirect: true }),
  meta: () => api_fetch<Meta>(`${BASE}/meta`),
  list_employees: (query: EmployeeListQuery) =>
    api_fetch<EmployeeListResponse>(`${BASE}/employees`, { query: { ...query } }),
  get_employee: (id: string) => api_fetch<EmployeeDetail>(employee_path(id)),
  create_employee: (body: CreateEmployeeRequest) =>
    api_fetch<EmployeeDetail>(`${BASE}/employees`, { method: 'POST', body }),
  update_employee: (id: string, body: UpdateEmployeeRequest) =>
    api_fetch<Employee>(employee_path(id), { method: 'PATCH', body }),
  create_compensation: (id: string, body: CreateCompensationRequest) =>
    api_fetch<Compensation>(`${employee_path(id)}/compensations`, { method: 'POST', body }),
  correct_compensation: (id: string, compensation_id: string, body: CorrectCompensationRequest) =>
    api_fetch<Compensation>(`${employee_path(id)}/compensations/${encodeURIComponent(compensation_id)}`, {
      method: 'PATCH',
      body,
    }),
  overview: (as_of: string) => api_fetch<Overview>(`${BASE}/analytics/overview`, { query: { as_of } }),
};

export const query_keys = {
  me: ['me'] as const,
  meta: ['meta'] as const,
  overview_all: ['overview'] as const,
  overview: (as_of: string) => ['overview', as_of] as const,
  employees_all: ['employees'] as const,
  employees: (query: EmployeeListQuery) => ['employees', query] as const,
  employee: (id: string) => ['employee', id] as const,
};
