import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';

@Injectable()
export class WatchHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // History fetch karo (max 10)
  // =====================
  async getHistory(userId: string) {
    return await this.prisma.watchHistory.findMany({
      where: { userId },
      include: {
        product: {
          include: {
            images: { where: { isPrimary: true }, take: 1 },
            variants: {
              where: { isActive: true },
              orderBy: { sellingPrice: 'asc' },
              take: 1,
            },
            productRatingSummaries: true,
          },
        },
      },
      orderBy: { viewedAt: 'desc' },
      take: 10,
    });
  }

  // =====================
  // History update karo (product open hone pe)
  // =====================
  async upsert(userId: string, productId: string) {
    return await this.prisma.$transaction(async (tx) => {
      await tx.watchHistory.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId },
        update: { viewedAt: new Date() },
      });

      const extra = await tx.watchHistory.findMany({
        where: { userId },
        orderBy: { viewedAt: 'desc' },
        skip: 10,
        select: { userId: true, productId: true },
      });

      if (extra.length > 0) {
        await tx.watchHistory.deleteMany({
          where: {
            OR: extra.map((h) => ({
              userId: h.userId,
              productId: h.productId,
            })),
          },
        });
      }
    });
  }

  // =====================
  // Single item remove karo
  // =====================
  async remove(userId: string, productId: string): Promise<void> {
    await this.prisma.watchHistory.delete({
      where: { userId_productId: { userId, productId } },
    });
  }
}
