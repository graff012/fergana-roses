import { IsString, MaxLength, MinLength } from 'class-validator';

export class LoginPhoneNumberDto {
  @IsString()
  @MaxLength(20)
  @MinLength(12)
  phone_number: string;
}
