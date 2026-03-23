import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { CartService } from './cart.service';
import { AddToCartRequestDto, UpdateCartRequestDto } from './dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('cart')
export class CartController extends BaseController {
  constructor(private readonly cartService: CartService) {
    super();
  }

  // POST /cart
  @ApiOperation({ summary: 'User - Add to cart ' })
  @Post()
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  addToCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.cartService.addToCart(ctx.user.id, dto);
  }

  // GET /cart
  @ApiOperation({ summary: 'User - Get all cart items' })
  @Get()
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  getCart(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.cartService.getCart(ctx.user.id);
  }

  // PATCH /cart/:itemId
  @ApiOperation({ summary: 'User - update quantity of item into cart' })
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  @Patch(':itemId')
  updateQuantity(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCartRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.cartService.updateQuantity(ctx.user.id, itemId, dto);
  }

  // DELETE /cart/:itemId
  @ApiOperation({ summary: 'Remove item from cart' })
  @ApiParam({ name: 'variantId', description: 'Variant ID' })
  @ApiResponse({ status: 200, description: 'Item removed' })
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('itemId') itemId: string,
  ) {
    const ctx = this.getContext(req);
    return this.cartService.removeItem(ctx.user.id, itemId);
  }

  // DELETE /cart
  @ApiOperation({ summary: 'User - Clear the cart' })
  @Roles(UserType.User)
  @UseGuards(RolesGuard)
  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.cartService.clearCart(ctx.user.id);
  }
}
