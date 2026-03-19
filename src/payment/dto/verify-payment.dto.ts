import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyPaymentDto {
  @ApiProperty({ example: 'order_xxxx' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ example: 'pay_xxxx' })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'signature_xxxx' })
  @IsString()
  razorpaySignature: string;

  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  orderId: string;
}
