import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Length,
  Matches,
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
