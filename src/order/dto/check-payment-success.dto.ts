import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CheckPaymentSuccessDto {
  @ApiProperty({ description: 'order Id for payment regarding' })
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @ApiProperty({ description: 'payment intent id for confirmation' })
  @IsString()
  @IsNotEmpty()
  paymentIntentId: string;
}
