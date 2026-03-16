import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  RolesGuard,
  UserType,
  Roles,
  AccessGuard,
} from '@Common';
import { SellerService } from './seller.service';
// import {
//   GetSellersRequestDto
//   UpdateSellerProfileDetailsRequestDto,
//   UpdateSellerProfileImageRequestDto,
//   UpdateSellerProfileRequestDto,
// } from './dto';

import {
  GetSellersRequestDto,
  UpdateSellerProfileImageRequestDto,
  UpdateSellerProfileRequestDto,
  UpdateSellerProfileDetailsRequestDto,
} from './dto';

import { ChangePasswordRequestDto } from 'src/users/dto';
import { SellerStatus } from '../generated/prisma/client';

@ApiTags('Seller')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('sellers')
export class SellerController extends BaseController {
  constructor(private readonly sellerService: SellerService) {
    super();
  }

  // ─── Admin only routes ───────────────────────────────────────

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get()
  async getSellers(@Query() query: GetSellersRequestDto) {
    return await this.sellerService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get(':sellerId')
  async getSellerProfile(@Param('sellerId') sellerId: string) {
    return await this.sellerService.getProfile(sellerId);
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Patch(':sellerId')
  async updateSellerProfileByAdmin(
    @Param('sellerId') sellerId: string,
    @Body() data: UpdateSellerProfileRequestDto,
  ) {
    return await this.sellerService.updateProfileDetailsByAdministrator({
      sellerId,
      businessName: data.businessName,
      contactEmail: data.contactEmail,
      dialCode: data.dialCode,
      contactPhone: data.contactPhone,
      password: data.password,
    });
  }

  @ApiParam({ name: 'status', enum: SellerStatus })
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Post(':sellerId/:status')
  async setSellerStatus(
    @Param('sellerId') sellerId: string,
    @Param('status', new ParseEnumPipe(SellerStatus)) status: SellerStatus,
  ) {
    await this.sellerService.setStatus(sellerId, status);
    return { status: 'success' };
  }

  // ─── Seller own routes ───────────────────────────────────────

  @Roles(UserType.Seller)
  @UseGuards(RolesGuard)
  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.sellerService.getProfile(ctx.user.id);
  }

  @Roles(UserType.Seller)
  @UseGuards(RolesGuard)
  @Patch('me')
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateSellerProfileDetailsRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.sellerService.updateProfileDetails({
      sellerId: ctx.user.id,
      businessName: data.businessName,
      contactEmail: data.contactEmail,
      dialCode: data.dialCode,
      contactPhone: data.contactPhone,
    });
    return { status: 'success' };
  }

  @Roles(UserType.Seller)
  @UseGuards(RolesGuard)
  @Post('me/profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateSellerProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.sellerService.updateProfileImage(
      ctx.user.id,
      data.profileImage,
    );
  }

  @Roles(UserType.Seller)
  @UseGuards(RolesGuard)
  @Post('me/change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.sellerService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }
}
