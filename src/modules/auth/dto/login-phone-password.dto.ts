import {
  IsString,
  IsStrongPassword,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginPhoneAndPasswordDto {
  @IsString()
  @MaxLength(20)
  @MinLength(12)
  phone_number: string;
}
