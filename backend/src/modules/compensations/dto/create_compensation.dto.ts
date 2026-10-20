import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsDateOnly } from '../../../common/dates';
import { CHANGE_REASONS, CURRENCIES, CompensationReason } from '../../../common/reference_data';

export class CreateCompensationDto {
  @IsDateOnly()
  effective_from: string;

  @IsInt({ message: 'must be a positive integer' })
  @Min(1, { message: 'must be a positive integer' })
  @Max(Number.MAX_SAFE_INTEGER)
  amount_minor: number;

  @IsIn(CURRENCIES, { message: 'must be one of the supported currencies' })
  currency: string;

  @IsIn(CHANGE_REASONS, { message: `must be one of ${CHANGE_REASONS.join(', ')}` })
  reason: CompensationReason;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string | null;
}
