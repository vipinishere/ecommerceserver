import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SellerSendCodeDto {
  @ApiProperty({ example: 'seller@business.com' })
  @IsEmail()
  @IsNotEmpty()
  contactEmail: string;
}
