import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class CreateWalletPaymentIntentDto {
  @ApiProperty({ example: 500, minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ enum: ['card', 'upi'] })
  @IsEnum(['card', 'upi'])
  paymentMethod: 'card' | 'upi';
}
