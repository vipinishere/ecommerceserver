import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma';
import { Prisma, Review } from '../generated/prisma/client';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================
  // Product ki sari reviews
  // =====================
  async getProductReviews(
    productId: string,
    options: {
      skip?: number;
      take?: number;
      rating?: number;
    },
  ) {
    const pagination = { skip: options.skip ?? 0, take: options.take ?? 10 };
    const where: Prisma.ReviewWhereInput = { productId };

    if (options.rating) {
      where.rating = options.rating;
    }

    const [count, data] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: {
          images: true,
          videos: true,
          user: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              profileImage: true,
            },
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
  // User ki apni review fetch
  // =====================
  async getUserReview(productId: string, userId: string): Promise<Review> {
    return await this.prisma.review.findUniqueOrThrow({
      where: { userId_productId: { userId, productId } },
      include: { images: true, videos: true },
    });
  }

  // =====================
  // Review create karo
  // =====================
  async create(
    userId: string,
    data: {
      productId: string;
      orderId: string;
      rating: number;
      title?: string;
      body?: string;
      images?: string[];
      video?: string;
    },
  ): Promise<Review> {
    // Verified purchase check
    const order = await this.prisma.order.findFirst({
      where: {
        id: data.orderId,
        userId,
        items: {
          some: { productId: data.productId },
        },
      },
    });

    if (!order) {
      throw new Error('You can only review products you have ordered');
    }

    // Already review diya?
    const existing = await this.prisma.review.findUnique({
      where: {
        userId_productId: { userId, productId: data.productId },
      },
    });

    if (existing) {
      throw new Error('You have already reviewed this product');
    }

    // Max images check
    if (data.images && data.images.length > 3) {
      throw new Error('Maximum 3 images allowed per review');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Review create karo
      const review = await tx.review.create({
        data: {
          userId,
          productId: data.productId,
          orderId: data.orderId,
          rating: data.rating,
          title: data.title,
          body: data.body,
          isVerifiedPurchase: true,
          // Images add karo
          images: data.images?.length
            ? {
                create: data.images.map((imageUrl) => ({ imageUrl })),
              }
            : undefined,
          // Video add karo
          videos: data.video
            ? { create: [{ videoUrl: data.video }] }
            : undefined,
        },
        include: { images: true, videos: true },
      });

      // Rating summary update karo
      await this.updateRatingSummary(tx, data.productId);

      return review;
    });
  }

  // =====================
  // Review update karo
  // =====================
  async update(
    userId: string,
    productId: string,
    data: {
      rating?: number;
      title?: string;
      body?: string;
      images?: string[];
      video?: string;
    },
  ): Promise<Review> {
    // Review exist karta hai?
    const review = await this.prisma.review.findUniqueOrThrow({
      where: { userId_productId: { userId, productId } },
      include: { images: true, videos: true },
    });

    // Max images check
    if (data.images && data.images.length > 3) {
      throw new Error('Maximum 3 images allowed per review');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Purani images delete karo
      if (data.images !== undefined) {
        await tx.reviewImage.deleteMany({
          where: { reviewId: review.id },
        });
      }

      // Purana video delete karo
      if (data.video !== undefined) {
        await tx.reviewVideo.deleteMany({
          where: { reviewId: review.id },
        });
      }

      // Review update karo
      const updated = await tx.review.update({
        where: { id: review.id },
        data: {
          rating: data.rating,
          title: data.title,
          body: data.body,
          // Nayi images
          images: data.images?.length
            ? {
                create: data.images.map((imageUrl) => ({ imageUrl })),
              }
            : undefined,
          // Naya video
          videos: data.video
            ? { create: [{ videoUrl: data.video }] }
            : undefined,
        },
        include: { images: true, videos: true },
      });

      // Rating summary update karo
      if (data.rating !== undefined) {
        await this.updateRatingSummary(tx, productId);
      }

      return updated;
    });
  }

  // =====================
  // Review delete karo (admin)
  // =====================
  async delete(reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUniqueOrThrow({
      where: { id: reviewId },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.review.delete({ where: { id: reviewId } });
      await this.updateRatingSummary(tx, review.productId);
    });
  }

  // =====================
  // Rating summary auto update
  // =====================
  private async updateRatingSummary(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    // Sari reviews fetch karo
    const reviews = await tx.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;

    // Agar koi review nahi toh summary delete karo
    if (totalReviews === 0) {
      await tx.productRatingSummary.deleteMany({ where: { productId } });
      return;
    }

    // Rating counts calculate karo
    const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalRating = 0;

    for (const review of reviews) {
      ratingCounts[review.rating as keyof typeof ratingCounts]++;
      totalRating += review.rating;
    }

    const averageRating = totalRating / totalReviews;

    // Upsert rating summary
    await tx.productRatingSummary.upsert({
      where: { productId },
      create: {
        productId,
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
        averageRating,
        totalReviews,
      },
      update: {
        rating1Count: ratingCounts[1],
        rating2Count: ratingCounts[2],
        rating3Count: ratingCounts[3],
        rating4Count: ratingCounts[4],
        rating5Count: ratingCounts[5],
        averageRating,
        totalReviews,
      },
    });
  }
}
