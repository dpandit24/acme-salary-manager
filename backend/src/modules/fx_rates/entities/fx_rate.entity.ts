import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'fx_rates' })
export class FxRate {
  @PrimaryColumn({ name: 'currency', type: 'char', length: 3 })
  currency: string;

  /** USD major units for 1 major unit of `currency`, times 1,000,000. */
  @Column({ name: 'rate_to_usd_ppm', type: 'integer' })
  rate_to_usd_ppm: number;

  @Column({ name: 'as_of', type: 'date' })
  as_of: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
