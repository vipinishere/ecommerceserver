// create-wishlist.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWishlistDto {
  @ApiProperty({ example: 'My Favourites' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
