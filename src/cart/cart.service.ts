import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma';
import { AddToCartRequestDto } from './dto';
import { UpdateCartRequestDto } from './dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  // ─── ADD TO CART ─────────────────────────────────────────────

  async addToCart(userId: string, dto: AddToCartRequestDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Product not found');

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.productId !== dto.productId) {
      throw new BadRequestException('Variant does not belong to this product');
    }
    if (!variant.isActive) {
      throw new BadRequestException('This variant is currently unavailable');
    }
    if (variant.stockQuantity < (dto.quantity ?? 1)) {
      throw new BadRequestException(
        `Only ${variant.stockQuantity} items available in stock`,
      );
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_variantId: { userId, variantId: dto.variantId },
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + (dto.quantity ?? 1);

      if (variant.stockQuantity < newQuantity) {
        throw new BadRequestException(
          `Only ${variant.stockQuantity} items available in stock`,
        );
      }
      if (newQuantity > 10) {
        throw new BadRequestException(
          'Maximum 10 items allowed per product in cart',
        );
      }

      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: { select: { id: true, internalName: true, mrp: true } },
          variant: {
            select: {
              id: true,
              sku: true,
              sellingPrice: true,
              color: true,
              size: true,
              storage: true,
              stockQuantity: true,
            },
          },
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        userId,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity ?? 1,
      },
      include: {
        product: { select: { id: true, internalName: true, mrp: true } },
        variant: {
          select: {
            id: true,
            sku: true,
            sellingPrice: true,
            color: true,
            size: true,
            storage: true,
            stockQuantity: true,
          },
        },
      },
    });
  }

  // ─── GET CART ─────────────────────────────────────────────────

  async getCart(userId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          select: {
            id: true,
            internalName: true,
            seoTitle: true,
            mrp: true,
            discountPercent: true,
            isFreeDelivery: true,
            isPayOnDelivery: true,
            seller: { select: { id: true, businessName: true } },
            images: {
              where: { isPrimary: true },
              select: { imageUrl: true, altText: true },
              take: 1,
            },
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            sellingPrice: true,
            mrp: true,
            color: true,
            size: true,
            storage: true,
            stockQuantity: true,
            isActive: true,
          },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    const subtotal = items.reduce(
      (sum, item) => sum + Number(item.variant.sellingPrice) * item.quantity,
      0,
    );
    const totalMrp = items.reduce(
      (sum, item) => sum + Number(item.variant.mrp) * item.quantity,
      0,
    );
    const totalDiscount = totalMrp - subtotal;

    return {
      items,
      summary: {
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
        totalMrp: totalMrp.toFixed(2),
        totalDiscount: totalDiscount.toFixed(2),
        subtotal: subtotal.toFixed(2),
      },
    };
  }

  // ─── UPDATE QUANTITY ──────────────────────────────────────────

  async updateQuantity(
    userId: string,
    itemId: string,
    dto: UpdateCartRequestDto,
  ) {
    const cartItem = await this.findCartItem(userId, itemId);

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: cartItem.variantId },
    });
    if (!variant) throw new NotFoundException('Variant not found');
    if (variant.stockQuantity < dto.quantity) {
      throw new BadRequestException(
        `Only ${variant.stockQuantity} items available in stock`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
      include: {
        product: { select: { id: true, internalName: true } },
        variant: {
          select: { id: true, sellingPrice: true, stockQuantity: true },
        },
      },
    });
  }

  // ─── REMOVE ITEM ──────────────────────────────────────────────

  async removeItem(userId: string, itemId: string) {
    await this.findCartItem(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed from cart' };
  }

  // ─── CLEAR CART ───────────────────────────────────────────────

  async clearCart(userId: string) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { message: 'Cart cleared successfully' };
  }

  // ─── HELPER ───────────────────────────────────────────────────

  private async findCartItem(userId: string, itemId: string) {
    const cartItem = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });
    if (!cartItem) throw new NotFoundException('Cart item not found');
    if (cartItem.userId !== userId)
      throw new ForbiddenException('Access denied');
    return cartItem;
  }
}
