import { IsString, MaxLength, MinLength } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @MaxLength(20)
  @MinLength(10)
  phone_number: string;

  @IsString()
  @MaxLength(6)
  @MinLength(1)
  code: string;
}
