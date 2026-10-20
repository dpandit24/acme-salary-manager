import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApiError } from '../../common/api_error';
import { foreign_key_violation, unique_violation } from '../../common/pg_errors';
import { FxRatesService, FxSnapshot } from '../fx_rates/fx_rates.service';
import { select_current } from './compensation_rules';
import { CompensationsRepository } from './compensations.repository';
import { CompensationView, NewCompensation } from './dto/compensation_view';
import { CorrectCompensationDto } from './dto/correct_compensation.dto';
import { CreateCompensationDto } from './dto/create_compensation.dto';
import { Compensation } from './entities/compensation.entity';

const DUPLICATE_DATE = 'uq_compensations_employee_id_effective_from';
const DUPLICATE_DATE_MESSAGE = 'That date already has a compensation row';

export interface EmployeeCompensations {
  current_compensation: CompensationView | null;
  compensations: CompensationView[];
}

@Injectable()
export class CompensationsService {
  constructor(
    private readonly compensations_repository: CompensationsRepository,
    private readonly fx_rates_service: FxRatesService,
  ) {}

  /** Current pay per employee on `as_of`, keyed by employee_id. */
  async get_current_compensations(as_of: string, employee_ids?: readonly string[]): Promise<Map<string, CompensationView>> {
    if (employee_ids && employee_ids.length === 0) return new Map();
    const [rows, snapshot] = await Promise.all([
      this.compensations_repository.find_current(as_of, employee_ids),
      this.fx_rates_service.get_snapshot(),
    ]);
    return new Map(rows.map((row) => [row.employee_id, to_view(row, snapshot)]));
  }

  async get_for_employee(employee_id: string, as_of: string): Promise<EmployeeCompensations> {
    const [rows, snapshot] = await Promise.all([
      this.compensations_repository.find_for_employee(employee_id),
      this.fx_rates_service.get_snapshot(),
    ]);
    const compensations = rows.map((row) => to_view(row, snapshot));
    return { current_compensation: select_current(compensations, as_of), compensations };
  }

  /** The hire row, written inside the caller's transaction (EmployeesService.create). */
  async create_initial_compensation(employee_id: string, input: NewCompensation, manager: EntityManager): Promise<void> {
    await this.compensations_repository.insert({ ...input, employee_id, reason: 'hire', note: input.note ?? null }, manager);
  }

  async create(employee_id: string, dto: CreateCompensationDto): Promise<CompensationView> {
    try {
      const row = await this.compensations_repository.insert({ ...dto, employee_id, note: dto.note ?? null });
      return to_view(row, await this.fx_rates_service.get_snapshot());
    } catch (error) {
      if (unique_violation(error) === DUPLICATE_DATE) throw duplicate_date_error();
      if (foreign_key_violation(error)) throw ApiError.not_found('Employee not found');
      throw error;
    }
  }

  async correct(employee_id: string, compensation_id: string, dto: CorrectCompensationDto): Promise<CompensationView> {
    if (dto.reason !== 'correction') {
      throw ApiError.validation('A correction must use reason "correction"', { reason: 'must be correction' });
    }
    const row = await this.compensations_repository.find_one_for_employee(employee_id, compensation_id);
    if (!row) throw ApiError.not_found('Compensation not found');

    row.reason = 'correction';
    if (dto.effective_from !== undefined) row.effective_from = dto.effective_from;
    if (dto.amount_minor !== undefined) row.amount_minor = dto.amount_minor;
    if (dto.currency !== undefined) row.currency = dto.currency;
    if (dto.note !== undefined) row.note = dto.note;

    try {
      const saved = await this.compensations_repository.save(row);
      return to_view(saved, await this.fx_rates_service.get_snapshot());
    } catch (error) {
      if (unique_violation(error) === DUPLICATE_DATE) throw duplicate_date_error();
      throw error;
    }
  }
}

function duplicate_date_error(): ApiError {
  return ApiError.conflict(DUPLICATE_DATE_MESSAGE, { effective_from: 'already has a compensation row for this employee' });
}

function to_view(row: Compensation, snapshot: FxSnapshot): CompensationView {
  return {
    id: row.id,
    employee_id: row.employee_id,
    effective_from: row.effective_from,
    amount_minor: row.amount_minor,
    currency: row.currency,
    reason: row.reason,
    note: row.note,
    amount_usd_minor: snapshot.to_usd_minor(row.amount_minor, row.currency),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
