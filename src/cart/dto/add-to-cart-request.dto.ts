import { IsUUID, IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartRequestDto {
  @IsUUID()
  productId: string;

  @IsUUID()
  variantId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  quantity?: number = 1;
}
