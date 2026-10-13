import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class UpdateOrderItemDto {
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @IsNotEmpty()
  price?: number;

  @IsString()
  @IsUUID()
  @IsOptional()
  flower_id?: string;

  @IsString()
  @IsUUID()
  @IsOptional()
  order_id?: string;
}
