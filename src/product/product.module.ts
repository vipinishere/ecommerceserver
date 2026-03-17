import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import {
  ProductController,
  SellerProductController,
  AdminProductController,
} from './product.controller';
import { PrismaModule } from '../prisma';

@Module({
  imports: [PrismaModule],
  controllers: [
    ProductController,
    SellerProductController,
    AdminProductController,
  ],
  providers: [ProductService],
  exports: [ProductService],
})
export class ProductModule {}
