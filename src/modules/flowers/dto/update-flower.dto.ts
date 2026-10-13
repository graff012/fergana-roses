import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateFlowerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsOptional()
  smell?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value || '')
  flowerSize?: string;

  @IsString()
  @IsOptional()
  height?: string;

  @IsString()
  @IsOptional()
  price?: string;

  @IsString()
  @IsOptional()
  imgUrl?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  stock?: number;
}
