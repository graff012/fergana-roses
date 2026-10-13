import { IsOptional, IsString } from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  phoneNumber: string;

  @IsString()
  address: string;
}

export class LoginDto {
  @IsString()
  phoneNumber: string;

  @IsOptional()
  @IsString()
  password: string;

  @IsOptional()
  isAdmin?: boolean;
}
