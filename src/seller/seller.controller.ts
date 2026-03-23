import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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

import {
  UpdateSellerProfileImageRequestDto,
  UpdateSellerProfileDetailsRequestDto,
} from './dto';

import { ChangePasswordRequestDto } from 'src/users/dto';

@ApiTags('Seller')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('sellers')
export class SellerController extends BaseController {
  constructor(private readonly sellerService: SellerService) {
    super();
  }

  // ─── Seller own routes ───────────────────────────────────────

  @ApiOperation({ summary: 'seller persnal information' })
  @Roles(UserType.Seller)
  @UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
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
