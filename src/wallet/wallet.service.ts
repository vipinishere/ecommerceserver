import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
// import { OtpTransport } from '../generated/prisma/enums';
import {
  Prisma,
  TransactionType,
  WalletReferenceType,
  WalletTransactionStatus,
  PaymentTypeForWallet,
} from '../generated/prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // Wallet account create (user register pe call hoga)
  // =====================
  async createWalletAccount(userId: string) {
    return await this.prisma.walletAccount.create({
      data: { userId },
    });
  }

  // =====================
  // Wallet account fetch
  // =====================
  async getWalletByUserId(userId: string) {
    return await this.prisma.walletAccount.findUniqueOrThrow({
      where: { userId },
    });
  }

  async getWalletById(walletId: string) {
    return await this.prisma.walletAccount.findUniqueOrThrow({
      where: { id: walletId },
    });
  }

  // =====================
  // Deposit (UPI/Card)
  // =====================
  async deposit(
    userId: string,
    amount: number,
    paymentType: PaymentTypeForWallet,
    referenceId?: string,
  ) {
    const wallet = await this.getWalletByUserId(userId);
    const newBalance = Number(wallet.currentBalance) + amount;

    return await this.prisma.$transaction(async (tx) => {
      // Balance update karo
      await tx.walletAccount.update({
        where: { id: wallet.id },
        data: { currentBalance: newBalance },
      });

      // Transaction record banao
      return await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          transactionType: TransactionType.CREDIT,
          referenceType: WalletReferenceType.DEPOSIT,
          referenceId: referenceId ?? null,
          amount,
          balanceAfterTransaction: newBalance,
          status: WalletTransactionStatus.COMPLETED,
        },
      });
    });
  }

  // =====================
  // Order payment (wallet se paisa katega)
  // =====================
  async deductForOrder(
    userId: string,
    amount: number,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const wallet = await this.getWalletByUserId(userId);

    if (Number(wallet.currentBalance) < amount) {
      throw new Error('Insufficient wallet balance');
    }

    const newBalance = Number(wallet.currentBalance) - amount;
    const prismaClient = tx ?? this.prisma;

    // Balance update karo
    await prismaClient.walletAccount.update({
      where: { id: wallet.id },
      data: { currentBalance: newBalance },
    });

    // Transaction record banao
    return await prismaClient.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: TransactionType.DEBIT,
        referenceType: WalletReferenceType.ORDER,
        referenceId: orderId,
        amount,
        balanceAfterTransaction: newBalance,
        status: WalletTransactionStatus.COMPLETED,
      },
    });
  }

  // =====================
  // Refund (order cancel/return pe)
  // =====================
  async refund(
    userId: string,
    amount: number,
    orderId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const wallet = await this.getWalletByUserId(userId);
    const newBalance = Number(wallet.currentBalance) + amount;
    const prismaClient = tx ?? this.prisma;

    // Balance update karo
    await prismaClient.walletAccount.update({
      where: { id: wallet.id },
      data: { currentBalance: newBalance },
    });

    // Transaction record banao
    return await prismaClient.walletTransaction.create({
      data: {
        walletId: wallet.id,
        transactionType: TransactionType.CREDIT,
        referenceType: WalletReferenceType.REFUND,
        referenceId: orderId,
        amount,
        balanceAfterTransaction: newBalance,
        status: WalletTransactionStatus.COMPLETED,
      },
    });
  }

  // =====================
  // Transactions list (user ke liye)
  // =====================
  async getUserTransactions(
    userId: string,
    options: {
      skip?: number;
      take?: number;
      transactionType?: TransactionType;
      referenceType?: WalletReferenceType;
    },
  ) {
    const wallet = await this.getWalletByUserId(userId);
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };

    const where: Prisma.WalletTransactionWhereInput = {
      walletId: wallet.id,
    };

    if (options.transactionType) {
      where.transactionType = options.transactionType;
    }
    if (options.referenceType) {
      where.referenceType = options.referenceType;
    }

    const [count, data] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // =====================
  // Transactions list (admin ke liye — sari transactions)
  // =====================
  async getAllTransactions(options: {
    skip?: number;
    take?: number;
    transactionType?: TransactionType;
    referenceType?: WalletReferenceType;
    userId?: string;
  }) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };

    const where: Prisma.WalletTransactionWhereInput = {};

    if (options.transactionType) {
      where.transactionType = options.transactionType;
    }
    if (options.referenceType) {
      where.referenceType = options.referenceType;
    }
    if (options.userId) {
      where.wallet = { userId: options.userId };
    }

    const [count, data] = await Promise.all([
      this.prisma.walletTransaction.count({ where }),
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: Prisma.SortOrder.desc },
        skip: pagination.skip,
        take: pagination.take,
        include: {
          wallet: {
            select: {
              userId: true,
            },
          },
        },
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }
}
