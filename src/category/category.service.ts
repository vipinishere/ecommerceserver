import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Category } from '../generated/prisma/client';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // all main categories (with subcategories)
  // =====================
  async getAll(): Promise<Category[]> {
    return await this.prisma.category.findMany({
      where: { parentId: null }, // only main categories
      include: {
        children: {
          include: {
            children: true, // 2 levels deep
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // =====================
  // Single category
  // =====================
  async getById(categoryId: string): Promise<Category> {
    return await this.prisma.category.findUniqueOrThrow({
      where: { id: categoryId },
      include: {
        children: true,
        parent: true,
      },
    });
  }

  // =====================
  // Category wise products
  // =====================
  async getCategoryProducts(
    categoryId: string,
    options: { skip?: number; take?: number },
  ) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };

    // Category aur their subcategories products
    const category = await this.prisma.category.findUniqueOrThrow({
      where: { id: categoryId },
      include: { children: true },
    });

    const categoryIds = [categoryId, ...category.children.map((c) => c.id)];

    const [count, data] = await Promise.all([
      this.prisma.product.count({
        where: { categoryId: { in: categoryIds } },
      }),
      this.prisma.product.findMany({
        where: { categoryId: { in: categoryIds } },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
          variants: {
            where: { isActive: true },
            orderBy: { sellingPrice: 'asc' },
            take: 1,
          },
          productRatingSummaries: true,
          category: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: pagination.skip,
        take: pagination.take,
      }),
    ]);

    return { count, skip: pagination.skip, take: pagination.take, data };
  }

  // =====================
  // Admin — category create
  // =====================
  async create(data: {
    name: string;
    description?: string;
    parentId?: string;
  }): Promise<Category> {
    // Parent existed or not?
    if (data.parentId) {
      await this.prisma.category.findUniqueOrThrow({
        where: { id: data.parentId },
      });
    }

    return await this.prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId,
      },
    });
  }

  // =====================
  // Admin — category update
  // =====================
  async update(
    categoryId: string,
    data: Partial<{
      name: string;
      description: string;
      parentId: string;
    }>,
  ): Promise<Category> {
    return await this.prisma.category.update({
      where: { id: categoryId },
      data,
    });
  }

  // =====================
  // Admin — category delete
  // =====================
  async delete(categoryId: string): Promise<void> {
    // Subcategories hain toh delete nahi hogi
    const childCount = await this.prisma.category.count({
      where: { parentId: categoryId },
    });

    if (childCount > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    // Products hain toh delete nahi hogi
    const productCount = await this.prisma.product.count({
      where: { categoryId },
    });

    if (productCount > 0) {
      throw new Error('Cannot delete category with products');
    }

    await this.prisma.category.delete({ where: { id: categoryId } });
  }
}
