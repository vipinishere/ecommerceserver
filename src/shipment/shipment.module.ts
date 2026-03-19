import { Module } from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { PrismaModule } from '../prisma';
import { ShipmentController } from './shipment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ShipmentController],
  providers: [ShipmentService],
  exports: [ShipmentService], // OrderModule mein use hoga
})
export class ShipmentModule {}
