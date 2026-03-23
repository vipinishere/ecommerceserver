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
  AccessGuard,
  AuthenticatedRequest,
  BaseController,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import { AdminService } from './admin.service';
import {
  AuthenticateRequestDto,
  ChangePasswordRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
} from './dto';
import { SellerService } from 'src/seller/seller.service';
import {
  GetSellersRequestDto,
  UpdateSellerProfileRequestDto,
} from 'src/seller/dto';
import { SellerStatus } from 'src/generated/prisma/enums';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin')
export class AdminController extends BaseController {
  constructor(private readonly adminService: AdminService) {
    super();
  }

  @Get()
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.adminService.getProfile(ctx.user.id);
  }

  @Patch()
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileDetailsRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.adminService.updateProfileDetails(ctx.user.id, {
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
    });
    return { status: 'success' };
  }

  @Post('profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.adminService.updateProfileImage(ctx.user.id, data.profileImage);
  }

  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.adminService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }

  @Post('authenticate')
  async authenticate(
    @Req() req: AuthenticatedRequest,
    @Body() data: AuthenticateRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.adminService.authenticate(ctx.user.id, data.password);
    return { status: 'success' };
  }
}
@ApiTags('Admin Seller')
@ApiBearerAuth()
@Roles(UserType.Admin)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('admin/sellers')
export class AdminSellerController extends BaseController {
  constructor(private readonly sellerService: SellerService) {
    super();
  }
  @Get()
  async getSellers(@Query() query: GetSellersRequestDto) {
    return await this.sellerService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Get(':sellerId')
  async getSellerProfile(@Param('sellerId') sellerId: string) {
    return await this.sellerService.getProfile(sellerId);
  }

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
  @Post(':sellerId/:status')
  async setSellerStatus(
    @Param('sellerId') sellerId: string,
    @Param('status', new ParseEnumPipe(SellerStatus)) status: SellerStatus,
  ) {
    await this.sellerService.setStatus(sellerId, status);
    return { status: 'success' };
  }
}
