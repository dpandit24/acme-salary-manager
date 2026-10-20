import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly } from '../../../common/dates';
import { COUNTRY_CODES, CURRENCIES, DEPARTMENTS, LEVELS } from '../../../common/reference_data';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Identity fields plus the opening compensation; created in one transaction. */
export class CreateEmployeeDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  employee_number: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  email: string;

  @IsIn(COUNTRY_CODES, { message: 'must be one of the supported countries' })
  country_code: string;

  @IsIn(DEPARTMENTS, { message: 'must be one of the known departments' })
  department: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  job_title: string;

  @IsIn(LEVELS, { message: `must be one of ${LEVELS.join(', ')}` })
  level: string;

  @IsDateOnly()
  hire_date: string;

  /** Defaults to hire_date. */
  @IsOptional()
  @IsDateOnly()
  effective_from?: string;

  @IsInt({ message: 'must be a positive integer' })
  @Min(1, { message: 'must be a positive integer' })
  @Max(Number.MAX_SAFE_INTEGER)
  amount_minor: number;

  @IsIn(CURRENCIES, { message: 'must be one of the supported currencies' })
  currency: string;

  @IsOptional()
  @IsIn(['hire'], { message: 'must be hire' })
  reason?: 'hire';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
