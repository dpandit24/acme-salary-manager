import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly } from '../../../common/dates';
import { CURRENCIES } from '../../../common/reference_data';

/** Rewrites a wrong row in place. `reason` must be `correction`; that rule is enforced in CompensationsService. */
export class CorrectCompensationDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsDateOnly()
  effective_from?: string;

  @IsOptional()
  @IsInt({ message: 'must be a positive integer' })
  @Min(1, { message: 'must be a positive integer' })
  @Max(Number.MAX_SAFE_INTEGER)
  amount_minor?: number;

  @IsOptional()
  @IsIn(CURRENCIES, { message: 'must be one of the supported currencies' })
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
