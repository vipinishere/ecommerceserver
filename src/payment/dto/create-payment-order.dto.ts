import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';

export class CreatePaymentOrderDto {
  @ApiProperty({ example: 'uuid-here', description: 'Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ enum: ['CARD', 'UPI'], description: 'payment type' })
  @IsEnum(['CARD', 'UPI'])
  paymentType: 'CARD' | 'UPI';
}
