import { Module } from '@nestjs/common';
import { SellerService } from './seller.service';
import { PrismaService } from 'src/prisma';
import { OtpModule } from 'src/otp';
import { SellerController } from './seller.controller';

@Module({
  imports: [OtpModule],
  controllers: [SellerController],
  providers: [SellerService, PrismaService],
  exports: [SellerService],
})
export class SellerModule {}
