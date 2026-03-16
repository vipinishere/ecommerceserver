import { PaymentTypeForWallet } from 'src/generated/prisma/enums';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class DepositWalletDto {
  @ApiProperty({
    description: 'Amount to deposit',
    example: 500.0,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Payment type',
    enum: PaymentTypeForWallet,
    example: PaymentTypeForWallet.UPI,
  })
  @IsEnum(PaymentTypeForWallet)
  paymentType: PaymentTypeForWallet;
}
