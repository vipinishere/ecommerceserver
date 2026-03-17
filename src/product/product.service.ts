import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma, Product } from '../generated/prisma/client';

@Injectable()
export class ProductService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // Product create karo
  // =====================
  async create(
    sellerId: string,
    data: {
      internalName: string;
      seoTitle?: string;
      description?: string;
      categoryId: string;
      mrp: number;
      discountPercent?: number;
      sku?: string;
      giftOptionAvailable?: boolean;
      packagingType?: string;
      isFreeDelivery?: boolean;
      isPayOnDelivery?: boolean;
      returnPolicyId?: string;
      variants: {
        sku: string;
        variantName?: string;
        color?: string;
        size?: string;
        storage?: string;
        mrp: number;
        sellingPrice: number;
        stockQuantity: number;
      }[];
      specifications?: {
        attributeId: string;
        valueText?: string;
        valueNumber?: number;
        valueBoolean?: boolean;
      }[];
    },
  ): Promise<Product> {
    return await this.prisma.$transaction(async (tx) => {
      // Product create karo
      const product = await tx.product.create({
        data: {
          internalName: data.internalName,
          seoTitle: data.seoTitle,
          description: data.description,
          categoryId: data.categoryId,
          sellerId,
          mrp: data.mrp,
          discountPercent: data.discountPercent,
          sku: data.sku,
          giftOptionAvailable: data.giftOptionAvailable ?? false,
          packagingType: data.packagingType,
          isFreeDelivery: data.isFreeDelivery ?? false,
          isPayOnDelivery: data.isPayOnDelivery ?? false,
          returnPolicyId: data.returnPolicyId,
        },
      });

      // Variants create karo
      await tx.productVariant.createMany({
        data: data.variants.map((v) => ({
          productId: product.id,
          sku: v.sku,
          variantName: v.variantName,
          color: v.color,
          size: v.size,
          storage: v.storage,
          mrp: v.mrp,
          sellingPrice: v.sellingPrice,
          stockQuantity: v.stockQuantity,
        })),
      });

      // Specifications create karo
      if (data.specifications?.length) {
        await tx.productSpecification.createMany({
          data: data.specifications.map((s) => ({
            productId: product.id,
            attributeId: s.attributeId,
            valueText: s.valueText,
            valueNumber: s.valueNumber,
            valueBoolean: s.valueBoolean,
          })),
        });
      }

      // Price history track karo
      await tx.productPriceHistory.create({
        data: {
          productId: product.id,
          mrp: data.mrp,
          discountPercent: data.discountPercent ?? 0,
          sellingPrice: this.calculateSellingPrice(
            data.mrp,
            data.discountPercent,
          ),
          validFrom: new Date(),
        },
      });

      return product;
    });
  }

  // =====================
  // Product update karo (seller)
  // =====================
  async update(
    productId: string,
    sellerId: string,
    data: Partial<{
      internalName: string;
      seoTitle: string;
      description: string;
      categoryId: string;
      sku: string;
      giftOptionAvailable: boolean;
      packagingType: string;
      isFreeDelivery: boolean;
      isPayOnDelivery: boolean;
      returnPolicyId: string;
    }>,
  ): Promise<Product> {
    // Seller ka hi product hai?
    await this.getSellerProductById(productId, sellerId);

    return await this.prisma.product.update({
      where: { id: productId },
      data,
    });
  }

  // =====================
  // Price/discount update karo (auto price history)
  // =====================
  async updatePrice(
    productId: string,
    sellerId: string,
    mrp: number,
    discountPercent?: number,
  ): Promise<Product> {
    await this.getSellerProductById(productId, sellerId);

    return await this.prisma.$transaction(async (tx) => {
      // Purani price history close karo
      await tx.productPriceHistory.updateMany({
        where: {
          productId,
          validTo: null,
        },
        data: { validTo: new Date() },
      });

      // Naya price history add karo
      await tx.productPriceHistory.create({
        data: {
          productId,
          mrp,
          discountPercent: discountPercent ?? 0,
          sellingPrice: this.calculateSellingPrice(mrp, discountPercent),
          validFrom: new Date(),
        },
      });

      // Product update karo
      return await tx.product.update({
        where: { id: productId },
        data: { mrp, discountPercent },
      });
    });
  }

  // =====================
  // Product delete karo (admin only)
  // =====================
  async delete(productId: string): Promise<void> {
    await this.prisma.product.delete({
      where: { id: productId },
    });
  }

  // =====================
  // Image add karo (max 5)
  // =====================
  async addImage(
    productId: string,
    sellerId: string,
    imageUrl: string,
    altText?: string,
  ) {
    await this.getSellerProductById(productId, sellerId);

    // Max 5 images check
    const imageCount = await this.prisma.productImage.count({
      where: { productId },
    });
    if (imageCount >= 5) {
      throw new Error('Maximum 5 images allowed per product');
    }

    // Pehli image primary hogi
    const isPrimary = imageCount === 0;

    return await this.prisma.productImage.create({
      data: {
        productId,
        imageUrl,
        altText,
        isPrimary,
      },
    });
  }

  // =====================
  // Image delete karo
  // =====================
  async removeImage(
    productId: string,
    imageId: string,
    sellerId: string,
  ): Promise<void> {
    await this.getSellerProductById(productId, sellerId);

    const image = await this.prisma.productImage.findUniqueOrThrow({
      where: { id: imageId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      // Primary image delete hui toh next image ko primary banao
      if (image.isPrimary) {
        const nextImage = await tx.productImage.findFirst({
          where: { productId },
          orderBy: { createdAt: 'asc' },
        });
        if (nextImage) {
          await tx.productImage.update({
            where: { id: nextImage.id },
            data: { isPrimary: true },
          });
        }
      }
    });
  }

  // =====================
  // Variant add karo
  // =====================
  async addVariant(
    productId: string,
    sellerId: string,
    data: {
      sku: string;
      variantName?: string;
      color?: string;
      size?: string;
      storage?: string;
      mrp: number;
      sellingPrice: number;
      stockQuantity: number;
    },
  ) {
    await this.getSellerProductById(productId, sellerId);

    return await this.prisma.productVariant.create({
      data: { productId, ...data },
    });
  }

  // =====================
  // Variant update karo
  // =====================
  async updateVariant(
    productId: string,
    variantId: string,
    sellerId: string,
    data: Partial<{
      sku: string;
      variantName: string;
      color: string;
      size: string;
      storage: string;
      mrp: number;
      sellingPrice: number;
      stockQuantity: number;
      isActive: boolean;
    }>,
  ) {
    await this.getSellerProductById(productId, sellerId);

    return await this.prisma.productVariant.update({
      where: { id: variantId },
      data,
    });
  }

  // =====================
  // Specification update karo
  // =====================
  async upsertSpecification(
    productId: string,
    sellerId: string,
    attributeId: string,
    data: {
      valueText?: string;
      valueNumber?: number;
      valueBoolean?: boolean;
    },
  ) {
    await this.getSellerProductById(productId, sellerId);

    return await this.prisma.productSpecification.upsert({
      where: { productId_attributeId: { productId, attributeId } },
      create: { productId, attributeId, ...data },
      update: data,
    });
  }

  // =====================
  // Product list (public — with filters)
  // =====================
  async getAll(options: {
    search?: string;
    categoryId?: string;
    sellerId?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    skip?: number;
    take?: number;
  }) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };
    const where: Prisma.ProductWhereInput = {};

    // Search filter
    if (options.search) {
      where.OR = [
        { internalName: { contains: options.search, mode: 'insensitive' } },
        { seoTitle: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (options.categoryId) {
      where.categoryId = options.categoryId;
    }

    // Seller filter
    if (options.sellerId) {
      where.sellerId = options.sellerId;
    }

    // Price range filter
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      where.mrp = {
        gte: options.minPrice,
        lte: options.maxPrice,
      };
    }

    // Rating filter
    if (options.minRating !== undefined) {
      where.productRatingSummaries = {
        some: {
          averageRating: { gte: options.minRating },
        },
      };
    }

    const [count, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: {
            where: { isPrimary: true },
            take: 1,
          },
          variants: {
            where: { isActive: true },
            orderBy: { sellingPrice: 'asc' },
            take: 1, // sabse sasta variant
          },
          productRatingSummaries: true,
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // =====================
  // Single product detail (public)
  // =====================
  async getById(productId: string) {
    return await this.prisma.product.findUniqueOrThrow({
      where: { id: productId },
      include: {
        images: true,
        variants: { where: { isActive: true } },
        specifications: {
          include: {
            attribute: {
              include: { group: true },
            },
          },
        },
        category: true,
        seller: {
          select: {
            id: true,
            businessName: true,
            profileImage: true,
            isVerified: true,
          },
        },
        productRatingSummaries: true,
        returnPolicy: true,
      },
    });
  }

  // =====================
  // Seller ke apne products
  // =====================
  async getSellerProducts(
    sellerId: string,
    options: { skip?: number; take?: number; search?: string },
  ) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };
    const where: Prisma.ProductWhereInput = { sellerId };

    if (options.search) {
      where.internalName = { contains: options.search, mode: 'insensitive' };
    }

    const [count, data] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: true,
          productRatingSummaries: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // =====================
  // Category ke attributes fetch karo (seller ko fill karne ke liye)
  // =====================
  async getCategoryAttributes(categoryId: string) {
    return await this.prisma.categoryAttribute.findMany({
      where: { categoryId },
      include: {
        attribute: {
          include: { group: true },
        },
      },
    });
  }

  // =====================
  // Price calculate karo
  // =====================
  private calculateSellingPrice(mrp: number, discountPercent?: number): number {
    if (!discountPercent) return mrp;
    return mrp - (mrp * discountPercent) / 100;
  }

  // =====================
  // Seller product ownership check
  // =====================
  private async getSellerProductById(
    productId: string,
    sellerId: string,
  ): Promise<Product> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) throw new Error('Product not found');
    if (product.sellerId !== sellerId)
      throw new Error('Unauthorized — not your product');
    return product;
  }
}
