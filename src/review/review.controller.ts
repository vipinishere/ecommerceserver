import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto, ReviewQueryDto } from './dto';

// =====================
// Public routes
// =====================
@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Get product reviews' })
  @ApiParam({ name: 'productId' })
  @Get('product/:productId')
  getProductReviews(
    @Param('productId') productId: string,
    @Query() query: ReviewQueryDto,
  ) {
    return this.reviewService.getProductReviews(productId, {
      skip: query.skip,
      take: query.take,
      rating: query.rating,
    });
  }
}

// =====================
// User routes
// =====================
@ApiTags('Reviews')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('reviews')
export class UserReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Get my review for a product' })
  @ApiParam({ name: 'productId' })
  @Get('my/:productId')
  getMyReview(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
  ) {
    return this.reviewService.getUserReview(productId, req.user.id);
  }

  @ApiOperation({ summary: 'Create review (verified purchase only)' })
  @ApiResponse({ status: 201, description: 'Review created' })
  @ApiResponse({ status: 400, description: 'Not a verified purchase' })
  @Post()
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update my review' })
  @ApiParam({ name: 'productId' })
  @Patch(':productId')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewService.update(req.user.id, productId, dto);
  }
}

// =====================
// Admin routes
// =====================
@ApiTags('Admin Reviews')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/reviews')
export class AdminReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @ApiOperation({ summary: 'Delete review (admin only)' })
  @ApiParam({ name: 'reviewId' })
  @ApiResponse({ status: 200, description: 'Review deleted' })
  @HttpCode(200)
  @Delete(':reviewId')
  delete(@Param('reviewId') reviewId: string) {
    return this.reviewService.delete(reviewId);
  }
}
