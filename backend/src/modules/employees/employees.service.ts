import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ApiError, FieldErrors } from '../../common/api_error';
import { today_utc } from '../../common/dates';
import { unique_violation } from '../../common/pg_errors';
import { EMPLOYMENT_STATUSES, EmploymentStatus, PAYROLL_STATUSES } from '../../common/reference_data';
import { CompensationsService } from '../compensations/compensations.service';
import { CompensationView } from '../compensations/dto/compensation_view';
import { CreateEmployeeDto } from './dto/create_employee.dto';
import { ListEmployeesDto, ListStatus } from './dto/list_employees.dto';
import { UpdateEmployeeDto } from './dto/update_employee.dto';
import { EmployeeFilters, EmployeesRepository, PayrollMember } from './employees.repository';
import { Employee } from './entities/employee.entity';

const UNIQUE_FIELDS: Record<string, FieldErrors> = {
  uq_employees_employee_number: { employee_number: 'is already used by another employee' },
  uq_employees_email: { email: 'is already used by another employee' },
};

export interface CurrentPay {
  amount_minor: number | null;
  currency: string | null;
  amount_usd_minor: number | null;
  effective_from: string | null;
}

export type EmployeeListItem = Omit<Employee, 'created_at' | 'updated_at'> & CurrentPay;

export interface EmployeeList {
  items: EmployeeListItem[];
  page: number;
  page_size: number;
  total: number;
}

export interface EmployeeDetail extends Employee {
  current_compensation: CompensationView | null;
  compensations: CompensationView[];
}

@Injectable()
export class EmployeesService {
  constructor(
    private readonly employees_repository: EmployeesRepository,
    private readonly compensations_service: CompensationsService,
    private readonly data_source: DataSource,
  ) {}

  async list(query: ListEmployeesDto): Promise<EmployeeList> {
    const as_of = query.as_of ?? today_utc();
    const filters: EmployeeFilters = {
      q: query.q,
      country_code: query.country_code,
      department: query.department,
      level: query.level,
      statuses: statuses_for(query.status),
    };
    const offset = (query.page - 1) * query.page_size;

    if (query.sort === 'salary') {
      // Salary sort needs pay, which lives in another module: rank ids by current USD pay, then load one page.
      const ids = await this.employees_repository.find_matching_ids(filters);
      const pay = await this.compensations_service.get_current_compensations(as_of, ids);
      const ranked = rank_by_usd_pay(ids, pay, query.direction);
      const page_ids = ranked.slice(offset, offset + query.page_size);
      const by_id = new Map((await this.employees_repository.find_by_ids(page_ids)).map((row) => [row.id, row]));
      const items = page_ids.map((id) => to_list_item(by_id.get(id)!, pay.get(id)));
      return { items, page: query.page, page_size: query.page_size, total: ids.length };
    }

    const { rows, total } = await this.employees_repository.find_page(filters, {
      sort: query.sort,
      direction: query.direction,
      offset,
      limit: query.page_size,
    });
    const pay = await this.compensations_service.get_current_compensations(
      as_of,
      rows.map((row) => row.id),
    );
    return { items: rows.map((row) => to_list_item(row, pay.get(row.id))), page: query.page, page_size: query.page_size, total };
  }

  async get_detail(id: string, as_of = today_utc()): Promise<EmployeeDetail> {
    const [employee, compensations] = await Promise.all([
      this.employees_repository.find_by_id(id),
      this.compensations_service.get_for_employee(id, as_of),
    ]);
    if (!employee) throw ApiError.not_found('Employee not found');
    return { ...employee, ...compensations };
  }

  async create(dto: CreateEmployeeDto): Promise<EmployeeDetail> {
    const { effective_from, amount_minor, currency, note, reason: _reason, ...identity } = dto;
    try {
      const employee_id = await this.data_source.transaction(async (manager) => {
        const employee = await this.employees_repository.insert({ ...identity, status: 'active' }, manager);
        await this.compensations_service.create_initial_compensation(
          employee.id,
          { effective_from: effective_from ?? dto.hire_date, amount_minor, currency, reason: 'hire', note },
          manager,
        );
        return employee.id;
      });
      return this.get_detail(employee_id);
    } catch (error) {
      throw unique_error(error) ?? error;
    }
  }

  async update(id: string, dto: UpdateEmployeeDto): Promise<EmployeeDetail> {
    const employee = await this.employees_repository.find_by_id(id);
    if (!employee) throw ApiError.not_found('Employee not found');
    Object.assign(employee, without_undefined(dto));
    try {
      await this.employees_repository.save(employee);
    } catch (error) {
      throw unique_error(error) ?? error;
    }
    return this.get_detail(id);
  }

  /** Who is on payroll (active and on leave), with the attributes analytics groups by. */
  list_payroll_population(): Promise<PayrollMember[]> {
    return this.employees_repository.find_payroll_population(PAYROLL_STATUSES);
  }
}

function statuses_for(status: ListStatus | undefined): readonly EmploymentStatus[] {
  if (status === undefined) return PAYROLL_STATUSES;
  if (status === 'all') return EMPLOYMENT_STATUSES;
  return [status];
}

function rank_by_usd_pay(ids: string[], pay: Map<string, CompensationView>, direction: 'asc' | 'desc'): string[] {
  const sign = direction === 'desc' ? -1 : 1;
  return [...ids].sort((a, b) => {
    const pay_a = pay.get(a)?.amount_usd_minor;
    const pay_b = pay.get(b)?.amount_usd_minor;
    if (pay_a === undefined || pay_b === undefined) {
      if (pay_a === pay_b) return a < b ? -1 : 1;
      return pay_a === undefined ? 1 : -1; // no current pay sorts last in both directions
    }
    return pay_a === pay_b ? (a < b ? -1 : 1) : sign * (pay_a - pay_b);
  });
}

function to_list_item(employee: Employee, pay: CompensationView | undefined): EmployeeListItem {
  const { created_at: _created_at, updated_at: _updated_at, ...profile } = employee;
  return {
    ...profile,
    amount_minor: pay?.amount_minor ?? null,
    currency: pay?.currency ?? null,
    amount_usd_minor: pay?.amount_usd_minor ?? null,
    effective_from: pay?.effective_from ?? null,
  };
}

function unique_error(error: unknown): ApiError | undefined {
  const constraint = unique_violation(error);
  const fields = constraint ? UNIQUE_FIELDS[constraint] : undefined;
  return fields ? ApiError.conflict(`${Object.keys(fields)[0]} is already in use`, fields) : undefined;
}

function without_undefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}
