// add-wishlist-item.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ example: 'uuid-here' })
  @IsOptional()
  @IsString()
  variantId?: string;

  @ApiPropertyOptional({ example: 'Buy on sale' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
