import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { WishlistService } from './wishlist.service';
import {
  CreateWishlistDto,
  UpdateWishlistDto,
  AddWishlistItemDto,
} from './dto';

@ApiTags('Wishlist')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'Get all my wishlists' })
  @Get()
  getAll(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.wishlistService.getAll(req.user.id);
  }

  @ApiOperation({ summary: 'Get single wishlist' })
  @ApiParam({ name: 'wishlistId' })
  @Get(':wishlistId')
  getById(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
  ) {
    return this.wishlistService.getById(wishlistId, req.user.id);
  }

  @ApiOperation({ summary: 'Create wishlist (max 3)' })
  @Post()
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateWishlistDto,
  ) {
    return this.wishlistService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update wishlist' })
  @ApiParam({ name: 'wishlistId' })
  @Patch(':wishlistId')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
    @Body() dto: UpdateWishlistDto,
  ) {
    return this.wishlistService.update(wishlistId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Delete wishlist' })
  @ApiParam({ name: 'wishlistId' })
  @HttpCode(200)
  @Delete(':wishlistId')
  remove(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
  ) {
    return this.wishlistService.remove(wishlistId, req.user.id);
  }

  @ApiOperation({ summary: 'Add item to wishlist' })
  @ApiParam({ name: 'wishlistId' })
  @Post(':wishlistId/items')
  addItem(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistService.addItem(wishlistId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Remove item from wishlist' })
  @ApiParam({ name: 'wishlistId' })
  @ApiParam({ name: 'productId' })
  @HttpCode(200)
  @Delete(':wishlistId/items/:productId')
  removeItem(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.removeItem(wishlistId, productId, req.user.id);
  }

  @ApiOperation({ summary: 'Move item to cart' })
  @ApiParam({ name: 'wishlistId' })
  @ApiParam({ name: 'productId' })
  @Post(':wishlistId/items/:productId/move-to-cart')
  moveToCart(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('wishlistId') wishlistId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistService.moveToCart(wishlistId, productId, req.user.id);
  }
}

// =====================
// Public route — shareable wishlist
// =====================
@ApiTags('Wishlist')
@Controller('wishlist/public')
export class PublicWishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'View public wishlist (shareable link)' })
  @ApiParam({ name: 'wishlistId' })
  @Get(':wishlistId')
  getPublic(@Param('wishlistId') wishlistId: string) {
    return this.wishlistService.getPublicWishlist(wishlistId);
  }
}
