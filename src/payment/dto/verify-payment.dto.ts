import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'paymentIntent Id' })
  @IsString()
  paymentIntentId: string;

  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  orderId: string;
}
