// add-product-image.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class AddProductImageDto {
  @ApiProperty({ example: 'image-filename.jpg' })
  @IsString()
  imageUrl: string;

  @ApiPropertyOptional({ example: 'iPhone 15 front view' })
  @IsOptional()
  @IsString()
  altText?: string;
}
