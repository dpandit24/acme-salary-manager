import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, EntityManager, In, Repository, SelectQueryBuilder } from 'typeorm';
import { EmploymentStatus } from '../../common/reference_data';
import { Employee } from './entities/employee.entity';

export interface EmployeeFilters {
  q?: string;
  country_code?: string;
  department?: string;
  level?: string;
  statuses: readonly EmploymentStatus[];
}

export interface PageRequest {
  sort: 'name' | 'hire_date';
  direction: 'asc' | 'desc';
  offset: number;
  limit: number;
}

export type PayrollMember = Pick<Employee, 'id' | 'country_code' | 'department' | 'level'>;

@Injectable()
export class EmployeesRepository {
  constructor(@InjectRepository(Employee) private readonly employees: Repository<Employee>) {}

  async insert(values: Partial<Employee>, manager: EntityManager): Promise<Employee> {
    const repo = manager.getRepository(Employee);
    return repo.save(repo.create(values));
  }

  find_by_id(id: string): Promise<Employee | null> {
    return this.employees.findOne({ where: { id } });
  }

  find_by_ids(ids: readonly string[]): Promise<Employee[]> {
    return ids.length === 0 ? Promise.resolve([]) : this.employees.find({ where: { id: In([...ids]) } });
  }

  save(employee: Employee): Promise<Employee> {
    return this.employees.save(employee);
  }

  async find_page(filters: EmployeeFilters, page: PageRequest): Promise<{ rows: Employee[]; total: number }> {
    const order = page.direction === 'desc' ? 'DESC' : 'ASC';
    const query = this.filtered(filters).skip(page.offset).take(page.limit);
    if (page.sort === 'hire_date') query.orderBy('e.hire_date', order);
    else query.orderBy('e.last_name', order).addOrderBy('e.first_name', order);
    query.addOrderBy('e.employee_number', order);
    const [rows, total] = await query.getManyAndCount();
    return { rows, total };
  }

  /** Every matching id, unpaged. Used for the salary sort, which needs pay from CompensationsService. */
  async find_matching_ids(filters: EmployeeFilters): Promise<string[]> {
    const rows = await this.filtered(filters).select('e.id', 'id').orderBy('e.employee_number').getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  find_payroll_population(statuses: readonly EmploymentStatus[]): Promise<PayrollMember[]> {
    return this.employees.find({
      select: { id: true, country_code: true, department: true, level: true },
      where: { status: In([...statuses]) },
    });
  }

  private filtered(filters: EmployeeFilters): SelectQueryBuilder<Employee> {
    const query = this.employees.createQueryBuilder('e').where('e.status IN (:...statuses)', { statuses: filters.statuses });
    if (filters.country_code) query.andWhere('e.country_code = :country_code', { country_code: filters.country_code });
    if (filters.department) query.andWhere('e.department = :department', { department: filters.department });
    if (filters.level) query.andWhere('e.level = :level', { level: filters.level });
    if (filters.q) {
      const pattern = `%${filters.q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
      query.andWhere(
        new Brackets((match) =>
          match
            .where('e.employee_number ILIKE :pattern', { pattern })
            .orWhere('e.email ILIKE :pattern')
            .orWhere('e.first_name ILIKE :pattern')
            .orWhere('e.last_name ILIKE :pattern')
            .orWhere(`(e.first_name || ' ' || e.last_name) ILIKE :pattern`),
        ),
      );
    }
    return query;
  }
}
