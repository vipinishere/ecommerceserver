import { ApiProperty } from '@nestjs/swagger';

import { IsString, IsEnum } from 'class-validator';

export class CreateOrderPaymentIntentDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  orderId: string;

  @ApiProperty({
    example: 'payment method',
    enum: ['card', 'upi'],
    description: 'card → Credit/Debit, upi → UPI/QR',
  })
  @IsEnum(['card', 'upi'])
  paymentMethod: 'card' | 'upi';
}
