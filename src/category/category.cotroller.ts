import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { UserType } from '@Common';
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';
import { ProductQueryDto } from '../product/dto';

// =====================
// Public routes
// =====================
@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Get all categories with subcategories' })
  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  @ApiOperation({ summary: 'Get single category' })
  @ApiParam({ name: 'categoryId' })
  @Get(':categoryId')
  getById(@Param('categoryId') categoryId: string) {
    return this.categoryService.getById(categoryId);
  }

  @ApiOperation({ summary: 'Get category wise products' })
  @ApiParam({ name: 'categoryId' })
  @Get(':categoryId/products')
  getCategoryProducts(
    @Param('categoryId') categoryId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.categoryService.getCategoryProducts(categoryId, {
      skip: query.skip,
      take: query.take,
    });
  }
}

// =====================
// Admin routes
// =====================
@ApiTags('Admin Categories')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/categories')
export class AdminCategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Create category' })
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @ApiOperation({ summary: 'Update category' })
  @ApiParam({ name: 'categoryId' })
  @Patch(':categoryId')
  update(
    @Param('categoryId') categoryId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(categoryId, dto);
  }

  @ApiOperation({ summary: 'Delete category' })
  @ApiParam({ name: 'categoryId' })
  @HttpCode(200)
  @Delete(':categoryId')
  delete(@Param('categoryId') categoryId: string) {
    return this.categoryService.delete(categoryId);
  }
}
