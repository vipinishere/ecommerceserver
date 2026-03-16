import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateSellerProfileDetailsRequestDto {
  @ApiPropertyOptional({ example: 'My Business Pvt Ltd' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  businessName?: string;

  @ApiPropertyOptional({ example: 'seller@business.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+91' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(2, 4)
  dialCode?: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(7, 15)
  @Matches(/^\d+$/, { message: 'Contact phone must contain only digits' })
  contactPhone?: string;
}
