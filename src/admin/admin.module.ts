import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController, AdminSellerController } from './admin.controller';
import { PrismaModule } from '../prisma';
import { SellerModule } from 'src/seller';

@Module({
  imports: [PrismaModule, SellerModule],
  controllers: [AdminController, AdminSellerController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
