// create-product.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiProperty({ example: 'SKU-001' })
  @IsString()
  @MaxLength(100)
  sku: string;

  @ApiPropertyOptional({ example: '128GB Black' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  variantName?: string;

  @ApiPropertyOptional({ example: 'Black' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @ApiPropertyOptional({ example: 'XL' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  size?: string;

  @ApiPropertyOptional({ example: '128GB' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  storage?: string;

  @ApiProperty({ example: 79999 })
  @IsNumber()
  @Min(0)
  mrp: number;

  @ApiProperty({ example: 69999 })
  @IsNumber()
  @Min(0)
  sellingPrice: number;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(0)
  stockQuantity: number;
}

export class CreateProductSpecificationDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  attributeId: string;

  @ApiPropertyOptional({ example: 'AMOLED' })
  @IsOptional()
  @IsString()
  valueText?: string;

  @ApiPropertyOptional({ example: 6.5 })
  @IsOptional()
  @IsNumber()
  valueNumber?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  valueBoolean?: boolean;
}

export class CreateProductDto {
  @ApiProperty({ example: 'iPhone 15 Pro' })
  @IsString()
  @MaxLength(200)
  internalName: string;

  @ApiPropertyOptional({ example: 'Buy iPhone 15 Pro online' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @ApiPropertyOptional({ example: 'Latest iPhone with A17 chip' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  categoryId: string;

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

  @ApiPropertyOptional({ example: 'SKU-MAIN-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  giftOptionAvailable?: boolean;

  @ApiPropertyOptional({ example: 'Box' })
  @IsOptional()
  @IsString()
  packagingType?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isFreeDelivery?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPayOnDelivery?: boolean;

  @ApiPropertyOptional({ example: 'uuid-here' })
  @IsOptional()
  @IsString()
  returnPolicyId?: string;

  @ApiProperty({ type: [CreateProductVariantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductSpecificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductSpecificationDto)
  specifications?: CreateProductSpecificationDto[];
}
