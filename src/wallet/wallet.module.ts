import { Module } from '@nestjs/common';
// import { UsersService } from 'src/users';
import { WalletService } from './wallet.service';
import { AdminWalletController, WalletController } from './wallet.controller';
import { PrismaModule } from 'src/prisma';

@Module({
  imports: [PrismaModule],
  providers: [WalletService],
  controllers: [WalletController, AdminWalletController],
  exports: [WalletService],
})
export class WalletModule {}
