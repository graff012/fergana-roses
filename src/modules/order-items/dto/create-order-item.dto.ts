import { IsNotEmpty, IsNumber, IsString, IsUUID } from 'class-validator';

export class CreateOrderItemDto {
  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  flower_id: string;

  @IsString()
  @IsUUID()
  @IsNotEmpty()
  order_id: string;
}
