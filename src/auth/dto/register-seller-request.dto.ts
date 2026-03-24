import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterSellerDto {
  @ApiProperty({ example: 'My Business Pvt Ltd' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 150)
  businessName: string;

  @ApiProperty({ example: 'seller@business.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;

  @ApiProperty({ example: 'StrongPass@123' })
  @IsString()
  @IsNotEmpty()
  @Length(8, 50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must have uppercase, lowercase, number and special character',
  })
  password: string;

  @ApiProperty({ description: 'Address Line 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessAddressLine1: string;

  @ApiProperty({ description: 'Address Line 2' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  businessAddressLine2: string;

  @ApiProperty({ description: 'City' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  city: string;

  @ApiProperty({ description: 'State' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  state: string;

  @ApiProperty({ description: 'PostalCode' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  postalCode: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  country: string;

  @ApiProperty({ example: '+91' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 4)
  dialCode: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Length(7, 15)
  @Matches(/^\d+$/, { message: 'Contact phone must contain only digits' })
  contactPhone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  emailVerificationCode: string;
}
