import {
  Body,
  Controller,
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
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { OrderService } from './order.service';
import {
  PlaceOrderDto,
  OrderQueryDto,
  UpdateShipmentDto,
  AddTrackingEventDto,
} from './dto';
import { VerifyPaymentDto } from 'src/payment/dto';

// =====================
// User routes
// =====================
@ApiTags('Orders')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('orders')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Place order from cart' })
  @Post()
  placeOrder(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: PlaceOrderDto,
  ) {
    return this.orderService.placeOrder(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Complete payment after Razorpay checkout' })
  @Post('complete-payment')
  completePayment(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.orderService.completePayment({
      ...dto,
      userId: req.user.id,
    });
  }

  @ApiOperation({ summary: 'Retry failed payment' })
  @Post(':orderId/retry-payment')
  retryPayment(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('orderId') orderId: string,
    @Body() dto: { paymentType: 'card' | 'upi' },
  ) {
    return this.orderService.retryPaymentForOrder(
      orderId,
      req.user.id,
      dto.paymentType,
    );
  }

  @ApiOperation({ summary: 'Get my orders' })
  @Get()
  getMyOrders(
    @Req() req: Request & { user: AuthenticatedUser },
    @Query() query: OrderQueryDto,
  ) {
    return this.orderService.getUserOrders(req.user.id, {
      skip: query.skip,
      take: query.take,
      status: query.status,
    });
  }

  @ApiOperation({ summary: 'Get single order detail' })
  @ApiParam({ name: 'orderId' })
  @Get(':orderId')
  getOrderById(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.getOrderById(orderId, req.user.id);
  }

  @ApiOperation({ summary: 'Cancel order (before dispatch only)' })
  @ApiParam({ name: 'orderId' })
  @HttpCode(200)
  @Patch(':orderId/cancel')
  cancelOrder(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('orderId') orderId: string,
  ) {
    return this.orderService.cancelOrder(orderId, req.user.id);
  }
}

// =====================
// Admin routes
// =====================
@ApiTags('Admin Orders')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/orders')
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Get all orders' })
  @Get()
  getAllOrders(@Query() query: OrderQueryDto) {
    return this.orderService.getAllOrders({
      skip: query.skip,
      take: query.take,
      status: query.status,
    });
  }

  @ApiOperation({ summary: 'Update shipment status (courier API)' })
  @ApiParam({ name: 'orderId' })
  @Patch(':orderId/shipment')
  updateShipment(
    @Param('orderId') orderId: string,
    @Body() dto: UpdateShipmentDto,
  ) {
    return this.orderService.updateShipment(orderId, dto);
  }

  @ApiOperation({ summary: 'Add tracking event' })
  @ApiParam({ name: 'orderId' })
  @Post(':orderId/tracking')
  addTrackingEvent(
    @Param('orderId') orderId: string,
    @Body() dto: AddTrackingEventDto,
  ) {
    return this.orderService.addTrackingEvent(orderId, dto);
  }
}
