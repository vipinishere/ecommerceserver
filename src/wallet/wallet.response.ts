// wallet.response.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionType,
  WalletReferenceType,
  WalletTransactionStatus,
} from 'src/generated/prisma/enums';

export class WalletAccountResponse {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: 'uuid-here' })
  userId: string;

  @ApiProperty({ example: 1500.0 })
  currentBalance: number;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

export class WalletTransactionResponse {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: 'uuid-here' })
  walletId: string;

  @ApiProperty({ enum: TransactionType })
  transactionType: TransactionType;

  @ApiProperty({ enum: WalletReferenceType })
  referenceType: WalletReferenceType;

  @ApiProperty({ example: 'uuid-here', nullable: true })
  referenceId: string | null;

  @ApiProperty({ example: 500.0 })
  amount: number;

  @ApiProperty({ example: 1500.0 })
  balanceAfterTransaction: number;

  @ApiProperty({ enum: WalletTransactionStatus })
  status: WalletTransactionStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class WalletTransactionListResponse {
  @ApiProperty({ type: [WalletTransactionResponse] })
  data: WalletTransactionResponse[];

  @ApiProperty({ example: 50 })
  count: number;

  @ApiProperty({ example: 0 })
  skip: number;

  @ApiProperty({ example: 10 })
  take: number;
}
