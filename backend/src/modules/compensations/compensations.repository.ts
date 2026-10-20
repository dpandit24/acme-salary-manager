import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Compensation } from './entities/compensation.entity';

@Injectable()
export class CompensationsRepository {
  constructor(@InjectRepository(Compensation) private readonly compensations: Repository<Compensation>) {}

  private repo(manager?: EntityManager): Repository<Compensation> {
    return manager ? manager.getRepository(Compensation) : this.compensations;
  }

  async insert(values: Partial<Compensation>, manager?: EntityManager): Promise<Compensation> {
    const repo = this.repo(manager);
    return repo.save(repo.create(values));
  }

  save(compensation: Compensation): Promise<Compensation> {
    return this.compensations.save(compensation);
  }

  find_for_employee(employee_id: string): Promise<Compensation[]> {
    return this.compensations.find({ where: { employee_id }, order: { effective_from: 'ASC' } });
  }

  find_one_for_employee(employee_id: string, compensation_id: string): Promise<Compensation | null> {
    return this.compensations.findOne({ where: { id: compensation_id, employee_id } });
  }

  /** Latest row with effective_from <= as_of per employee. Restricted to `employee_ids` when given. */
  find_current(as_of: string, employee_ids?: readonly string[]): Promise<Compensation[]> {
    const query = this.compensations
      .createQueryBuilder('c')
      .distinctOn(['c.employee_id'])
      .where('c.effective_from <= :as_of', { as_of })
      .orderBy('c.employee_id')
      .addOrderBy('c.effective_from', 'DESC');
    if (employee_ids) query.andWhere('c.employee_id = ANY(:employee_ids)', { employee_ids });
    return query.getMany();
  }
}
