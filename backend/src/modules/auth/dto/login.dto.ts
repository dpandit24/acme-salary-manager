import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'must be a valid email address' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'is required' })
  @MaxLength(200)
  password: string;
}
