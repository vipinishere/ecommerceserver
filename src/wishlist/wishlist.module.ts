import { Module } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import {
  WishlistController,
  PublicWishlistController,
} from './wishlist.controller';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [WishlistController, PublicWishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
