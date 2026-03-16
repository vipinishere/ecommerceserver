import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class UpdateSellerProfileRequestDto {
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

  @ApiPropertyOptional({ example: 'NewPass@123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @Length(8, 50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must have uppercase, lowercase, number and special character',
  })
  password?: string;
}
