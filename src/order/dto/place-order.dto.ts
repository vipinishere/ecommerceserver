import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaymentType } from 'src/generated/prisma/enums';

export class PlaceOrderDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  addressId: string;

  @ApiProperty({ enum: PaymentType })
  @IsString()
  @IsEnum(PaymentType)
  paymentType: PaymentType;

  @ApiPropertyOptional({
    example: 'uuid-here',
    description: 'Required for Card/UPI',
  })
  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @ApiPropertyOptional({
    example: 'uuid-here',
    description: 'Required for Card/UPI',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;
}
