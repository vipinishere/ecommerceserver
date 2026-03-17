// update-product-price.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

export class UpdateProductPriceDto {
  @ApiProperty({ example: 79999 })
  @IsNumber()
  @Min(0)
  mrp: number;

  @ApiPropertyOptional({ example: 10.5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent?: number;
}
