import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  PaymentController,
  PaymentWebhookController,
} from './payment.controller';
import { PrismaModule } from '../prisma';
import { WalletModule } from '../wallet';

@Module({
  imports: [PrismaModule, WalletModule],
  controllers: [PaymentController, PaymentWebhookController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
