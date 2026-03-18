import { Module } from '@nestjs/common';
import { CategoryService } from './category.service';
import { PrismaModule } from '../prisma';
import {
  CategoryController,
  AdminCategoryController,
} from './category.cotroller';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryController, AdminCategoryController],
  providers: [CategoryService],
  exports: [CategoryService],
})
export class CategoryModule {}
