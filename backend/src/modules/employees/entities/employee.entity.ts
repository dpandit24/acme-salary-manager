import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { EmploymentStatus } from '../../../common/reference_data';

@Entity({ name: 'employees' })
export class Employee {
  @PrimaryGeneratedColumn('uuid', { name: 'id' })
  id: string;

  @Column({ name: 'employee_number', type: 'varchar', length: 20 })
  employee_number: string;

  @Column({ name: 'first_name', type: 'varchar', length: 100 })
  first_name: string;

  @Column({ name: 'last_name', type: 'varchar', length: 100 })
  last_name: string;

  @Column({ name: 'email', type: 'varchar', length: 320 })
  email: string;

  @Column({ name: 'country_code', type: 'char', length: 2 })
  country_code: string;

  @Column({ name: 'department', type: 'varchar', length: 100 })
  department: string;

  @Column({ name: 'job_title', type: 'varchar', length: 150 })
  job_title: string;

  @Column({ name: 'level', type: 'varchar', length: 10 })
  level: string;

  @Column({ name: 'status', type: 'varchar', length: 20 })
  status: EmploymentStatus;

  @Column({ name: 'hire_date', type: 'date' })
  hire_date: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
