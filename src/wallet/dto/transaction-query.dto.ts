// transaction-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  TransactionType,
  WalletReferenceType,
} from 'src/generated/prisma/enums';

export class TransactionQueryDto {
  @ApiPropertyOptional({
    description: 'Page number',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @ApiPropertyOptional({
    description: 'Transactions per page',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  take?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: TransactionType,
  })
  @IsOptional()
  @IsEnum(TransactionType)
  transactionType?: TransactionType;

  @ApiPropertyOptional({
    description: 'Filter by reference type',
    enum: WalletReferenceType,
  })
  @IsOptional()
  @IsEnum(WalletReferenceType)
  referenceType?: WalletReferenceType;
}
