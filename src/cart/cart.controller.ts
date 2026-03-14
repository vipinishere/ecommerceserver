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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
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
  @Post()
  addToCart(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddToCartRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.cartService.addToCart(ctx.user.id, dto);
  }

  // GET /cart
  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.cartService.getCart(ctx.user.id);
  }

  // PATCH /cart/:itemId
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
  @Delete()
  @HttpCode(HttpStatus.OK)
  clearCart(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return this.cartService.clearCart(ctx.user.id);
  }
}
