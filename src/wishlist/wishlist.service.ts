import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Wishlist } from '../generated/prisma/client';

@Injectable()
export class WishlistService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // User ki sari wishlists
  // =====================
  async getAll(userId: string): Promise<Wishlist[]> {
    return await this.prisma.wishlist.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =====================
  // Single wishlist fetch
  // =====================
  async getById(wishlistId: string, userId: string): Promise<Wishlist> {
    return await this.prisma.wishlist.findUniqueOrThrow({
      where: { id: wishlistId, userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
      },
    });
  }

  // =====================
  // Public wishlist fetch (shareable)
  // =====================
  async getPublicWishlist(wishlistId: string): Promise<Wishlist> {
    const wishlist = await this.prisma.wishlist.findUniqueOrThrow({
      where: { id: wishlistId },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true }, take: 1 },
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!wishlist.isPublic) {
      throw new Error('This wishlist is private');
    }

    return wishlist;
  }

  // =====================
  // Wishlist create karo (max 3)
  // =====================
  async create(
    userId: string,
    data: { name: string; isPublic?: boolean },
  ): Promise<Wishlist> {
    // Max 3 wishlists check
    const count = await this.prisma.wishlist.count({ where: { userId } });
    if (count >= 3) {
      throw new Error('Maximum 3 wishlists allowed per user');
    }

    return await this.prisma.wishlist.create({
      data: {
        userId,
        name: data.name,
        isPublic: data.isPublic ?? false,
      },
    });
  }

  // =====================
  // Wishlist update karo
  // =====================
  async update(
    wishlistId: string,
    userId: string,
    data: Partial<{ name: string; isPublic: boolean }>,
  ): Promise<Wishlist> {
    await this.getById(wishlistId, userId);

    return await this.prisma.wishlist.update({
      where: { id: wishlistId },
      data,
    });
  }

  // =====================
  // Wishlist delete karo
  // =====================
  async remove(wishlistId: string, userId: string): Promise<void> {
    await this.getById(wishlistId, userId);

    await this.prisma.wishlist.delete({ where: { id: wishlistId } });
  }

  // =====================
  // Item add karo
  // =====================
  async addItem(
    wishlistId: string,
    userId: string,
    data: {
      productId: string;
      variantId?: string;
      note?: string;
    },
  ) {
    // Wishlist user ka hi hai?
    await this.getById(wishlistId, userId);

    // Product exist karta hai?
    await this.prisma.product.findUniqueOrThrow({
      where: { id: data.productId },
    });

    // Already exist karta hai?
    const existing = await this.prisma.wishlistItem.findUnique({
      where: {
        wishlistId_productId: {
          wishlistId,
          productId: data.productId,
        },
      },
    });

    if (existing) {
      throw new Error('Product already in this wishlist');
    }

    return await this.prisma.wishlistItem.create({
      data: {
        wishlistId,
        productId: data.productId,
        variantId: data.variantId,
        note: data.note,
      },
    });
  }

  // =====================
  // Item remove karo
  // =====================
  async removeItem(
    wishlistId: string,
    productId: string,
    userId: string,
  ): Promise<void> {
    await this.getById(wishlistId, userId);

    await this.prisma.wishlistItem.delete({
      where: {
        wishlistId_productId: { wishlistId, productId },
      },
    });
  }

  // =====================
  // Move to cart
  // =====================
  async moveToCart(wishlistId: string, productId: string, userId: string) {
    const item = await this.prisma.wishlistItem.findUniqueOrThrow({
      where: {
        wishlistId_productId: { wishlistId, productId },
      },
    });

    if (!item.variantId) {
      throw new Error('Variant not selected — cannot add to cart');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Cart mein add karo
      await tx.cartItem.upsert({
        where: {
          userId_variantId: { userId, variantId: item.variantId! },
        },
        create: {
          userId,
          productId,
          variantId: item.variantId!,
          quantity: 1,
        },
        update: {
          quantity: { increment: 1 },
        },
      });

      // Wishlist se remove karo
      await tx.wishlistItem.delete({
        where: {
          wishlistId_productId: { wishlistId, productId },
        },
      });

      return { message: 'Moved to cart successfully' };
    });
  }
}
