import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import {
  ReviewController,
  UserReviewController,
  AdminReviewController,
} from './review.controller';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewController, UserReviewController, AdminReviewController],
  providers: [ReviewService],
  exports: [ReviewService],
})
export class ReviewModule {}
