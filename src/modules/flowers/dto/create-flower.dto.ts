import { IsString, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateFlowerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Transform(({ value }) => value || '')
  smell: string;

  @IsString()
  @Transform(({ value }) => value || '')
  flowerSize: string;

  @IsString()
  @Transform(({ value }) => value || '')
  height: string;

  @IsString()
  @IsNotEmpty()
  price: string;

  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;
}
