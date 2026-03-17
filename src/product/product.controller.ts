import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AccessGuard, JwtAuthGuard, Roles, RolesGuard } from '@Common';
import { AuthenticatedUser, UserType } from '@Common';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  UpdateProductDto,
  UpdateProductPriceDto,
  ProductQueryDto,
  AddProductImageDto,
  CreateProductVariantDto,
  CreateProductSpecificationDto,
} from './dto';

// =====================
// Public routes
// =====================
@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Get all products with filters' })
  @Get()
  getAll(@Query() query: ProductQueryDto) {
    return this.productService.getAll({
      search: query.search,
      categoryId: query.categoryId,
      sellerId: query.sellerId,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      minRating: query.minRating,
      skip: query.skip,
      take: query.take,
    });
  }

  @ApiOperation({ summary: 'Get single product detail' })
  @ApiParam({ name: 'productId' })
  @Get(':productId')
  getById(@Param('productId') productId: string) {
    return this.productService.getById(productId);
  }
}

// =====================
// Seller routes
// =====================
@ApiTags('Seller Products')
@ApiBearerAuth()
@Roles(UserType.Seller)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('seller/products')
export class SellerProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Get my products' })
  @Get()
  getMyProducts(
    @Req() req: Request & { user: AuthenticatedUser },
    @Query() query: ProductQueryDto,
  ) {
    return this.productService.getSellerProducts(req.user.id, {
      skip: query.skip,
      take: query.take,
      search: query.search,
    });
  }

  @ApiOperation({ summary: 'Create product' })
  @Post()
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateProductDto,
  ) {
    return this.productService.create(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update product' })
  @ApiParam({ name: 'productId' })
  @Patch(':productId')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(productId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update product price/discount' })
  @ApiParam({ name: 'productId' })
  @Patch(':productId/price')
  updatePrice(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: UpdateProductPriceDto,
  ) {
    return this.productService.updatePrice(
      productId,
      req.user.id,
      dto.mrp,
      dto.discountPercent,
    );
  }

  @ApiOperation({ summary: 'Add product image (max 5)' })
  @ApiParam({ name: 'productId' })
  @Post(':productId/images')
  addImage(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: AddProductImageDto,
  ) {
    return this.productService.addImage(
      productId,
      req.user.id,
      dto.imageUrl,
      dto.altText,
    );
  }

  @ApiOperation({ summary: 'Remove product image' })
  @ApiParam({ name: 'productId' })
  @ApiParam({ name: 'imageId' })
  @Delete(':productId/images/:imageId')
  removeImage(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productService.removeImage(productId, imageId, req.user.id);
  }

  @ApiOperation({ summary: 'Add product variant' })
  @ApiParam({ name: 'productId' })
  @Post(':productId/variants')
  addVariant(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: CreateProductVariantDto,
  ) {
    return this.productService.addVariant(productId, req.user.id, dto);
  }

  @ApiOperation({ summary: 'Update product variant' })
  @ApiParam({ name: 'productId' })
  @ApiParam({ name: 'variantId' })
  @Patch(':productId/variants/:variantId')
  updateVariant(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: Partial<CreateProductVariantDto>,
  ) {
    return this.productService.updateVariant(
      productId,
      variantId,
      req.user.id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Upsert product specification' })
  @ApiParam({ name: 'productId' })
  @Post(':productId/specifications')
  upsertSpec(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('productId') productId: string,
    @Body() dto: CreateProductSpecificationDto,
  ) {
    return this.productService.upsertSpecification(
      productId,
      req.user.id,
      dto.attributeId,
      {
        valueText: dto.valueText,
        valueNumber: dto.valueNumber,
        valueBoolean: dto.valueBoolean,
      },
    );
  }

  @ApiOperation({ summary: 'Get category attributes to fill' })
  @ApiParam({ name: 'categoryId' })
  @Get('category/:categoryId/attributes')
  getCategoryAttributes(@Param('categoryId') categoryId: string) {
    return this.productService.getCategoryAttributes(categoryId);
  }
}

// =====================
// Admin routes
// =====================
@ApiTags('Admin Products')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/products')
export class AdminProductController {
  constructor(private readonly productService: ProductService) {}

  @ApiOperation({ summary: 'Delete product (admin only)' })
  @ApiParam({ name: 'productId' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @Delete(':productId')
  delete(@Param('productId') productId: string) {
    return this.productService.delete(productId);
  }
}
