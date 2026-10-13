import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateOrderDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone_number?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  telegram_username?: string;

  @IsString()
  @IsOptional()
  @IsIn(['pending', 'paid', 'cancelled'])
  status?: 'pending' | 'paid' | 'cancelled';
}
