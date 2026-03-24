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
import {
  CreateOrderPaymentIntentDto,
  CreateWalletPaymentIntentDto,
} from './dto';

@ApiTags('Payment')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiOperation({ summary: 'Create Stripe Payment Intent for Order (prepaid)' })
  @Post('intent/order')
  createPaymentIntentForOrder(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateOrderPaymentIntentDto,
  ) {
    return this.paymentService.createOrderPaymentIntent(
      req.user.id,
      dto.orderId,
      dto.paymentMethod,
    );
  }

  @ApiOperation({ summary: 'Create Stripe Payment Intent for Wallet' })
  @Post('intent/wallet')
  createPaymentIntentForWallet(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() body: CreateWalletPaymentIntentDto,
  ) {
    return this.paymentService.createWalletPaymentIntent(
      req.user.id,
      body.amount,
      body.paymentMethod,
    );
  }
}

// =====================
// Webhook — Stripe auto update
// =====================
@Controller()
export class PaymentWebhookController {
  constructor(private readonly paymentService: PaymentService) {}

  @ApiExcludeEndpoint() // will not show in Swagger
  @Post('webhook/stripe')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const payload = req.rawBody?.toString() ?? '';
    return this.paymentService.handleWebhook(payload, signature);
  }
}
