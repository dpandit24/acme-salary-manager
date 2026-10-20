import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { bigint_transformer } from '../../../common/bigint_transformer';
import { CompensationReason } from '../../../common/reference_data';

@Entity({ name: 'compensations' })
export class Compensation {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'employee_id', type: 'uuid' })
  employee_id: string;

  @Column({ name: 'effective_from', type: 'date' })
  effective_from: string;

  @Column({ name: 'amount_minor', type: 'bigint', transformer: bigint_transformer })
  amount_minor: number;

  @Column({ name: 'currency', type: 'char', length: 3 })
  currency: string;

  @Column({ name: 'reason', type: 'varchar', length: 30 })
  reason: CompensationReason;

  @Column({ name: 'note', type: 'varchar', length: 500, nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
