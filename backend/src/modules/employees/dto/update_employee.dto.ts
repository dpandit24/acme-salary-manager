import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../../common/dates';
import { COUNTRY_CODES, DEPARTMENTS, EMPLOYMENT_STATUSES, EmploymentStatus, LEVELS } from '../../../common/reference_data';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Profile and status only. There are deliberately no pay fields: the global ValidationPipe runs with
 * forbidNonWhitelisted, so a body containing amount_minor or currency is rejected with 400.
 */
export class UpdateEmployeeDto {
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  first_name?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  last_name?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'must be a valid email address' })
  @MaxLength(320)
  email?: string;

  @IsOptional()
  @IsIn(COUNTRY_CODES, { message: 'must be one of the supported countries' })
  country_code?: string;

  @IsOptional()
  @IsIn(DEPARTMENTS, { message: 'must be one of the known departments' })
  department?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  job_title?: string;

  @IsOptional()
  @IsIn(LEVELS, { message: `must be one of ${LEVELS.join(', ')}` })
  level?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_STATUSES, { message: `must be one of ${EMPLOYMENT_STATUSES.join(', ')}` })
  status?: EmploymentStatus;

  @IsOptional()
  @IsDateOnly()
  hire_date?: string;
}
