import {
  Body,
  Controller,
  Headers,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { PaymentService } from './payment.service';
import { CreatePaymentOrderDto, VerifyPaymentDto } from './dto';

@ApiTags('Payment')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Create Razorpay order (prepaid)' })
  @Post('order')
  createPaymentOrder(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreatePaymentOrderDto,
  ) {
    return this.paymentService.createPaymentOrder(
      req.user.id,
      dto.orderId,
      dto.paymentType,
    );
  }

  @ApiOperation({ summary: 'Verify payment signature' })
  @Post('verify')
  verifyPayment(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: VerifyPaymentDto,
  ) {
    return this.paymentService.verifyPayment({
      ...dto,
      userId: req.user.id,
    });
  }
}

// =====================
// Webhook — Razorpay auto update
// =====================
@Controller()
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiExcludeEndpoint() // will not show in Swagger
  @Post('webhook/razorpay')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const payload = req.rawBody?.toString() ?? '';
    return this.paymentService.handleWebhook(payload, signature);
  }
}
