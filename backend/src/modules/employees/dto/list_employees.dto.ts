import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly } from '../../../common/dates';
import { EMPLOYMENT_STATUSES } from '../../../common/reference_data';

export const LIST_STATUSES = [...EMPLOYMENT_STATUSES, 'all'] as const;
export const LIST_SORTS = ['name', 'hire_date', 'salary'] as const;
export const MAX_PAGE_SIZE = 100;

export type ListStatus = (typeof LIST_STATUSES)[number];
export type ListSort = (typeof LIST_SORTS)[number];
export type SortDirection = 'asc' | 'desc';

const blank_to_undefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : typeof value === 'string' ? value.trim() : value;

export class ListEmployeesDto {
  @IsOptional()
  @Transform(blank_to_undefined)
  @IsString()
  @MaxLength(200)
  q?: string;

  @IsOptional()
  @Transform(blank_to_undefined)
  @IsString()
  country_code?: string;

  @IsOptional()
  @Transform(blank_to_undefined)
  @IsString()
  department?: string;

  @IsOptional()
  @Transform(blank_to_undefined)
  @IsString()
  level?: string;

  @IsOptional()
  @Transform(blank_to_undefined)
  @IsIn(LIST_STATUSES, { message: `must be one of ${LIST_STATUSES.join(', ')}` })
  status?: ListStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  page_size: number = 25;

  @IsOptional()
  @IsIn(LIST_SORTS, { message: `must be one of ${LIST_SORTS.join(', ')}` })
  sort: ListSort = 'name';

  @IsOptional()
  @IsIn(['asc', 'desc'], { message: 'must be asc or desc' })
  direction: SortDirection = 'asc';

  @IsOptional()
  @IsDateOnly()
  as_of?: string;
}

export class AsOfQueryDto {
  @IsOptional()
  @IsDateOnly()
  as_of?: string;
}
