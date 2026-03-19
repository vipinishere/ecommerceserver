import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController, AdminOrderController } from './order.controller';
import { PrismaModule } from '../prisma';
import { WalletModule } from '../wallet';
import { ShipmentModule } from 'src/shipment';
import { PaymentModule } from 'src/payment';

@Module({
  imports: [
    PrismaModule,
    WalletModule, // refund ke liye
    ShipmentModule,
    PaymentModule,
  ],
  controllers: [OrderController, AdminOrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
