import {
  BadRequestException,
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
import { UsersService } from './users.service';
import {
  ChangePasswordRequestDto,
  GetUsersRequestDto,
  UpdateProfileDetailsRequestDto,
  UpdateProfileImageRequestDto,
  UpdateUserProfileRequestDto,
} from './dto';
import { UserStatus } from '../generated/prisma/client';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AccessGuard)
@Controller('users')
export class UsersController extends BaseController {
  constructor(private readonly usersService: UsersService) {
    super();
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get()
  async getUsers(@Query() query: GetUsersRequestDto) {
    return await this.usersService.getAll({
      search: query.search,
      skip: query.skip,
      take: query.take,
    });
  }

  @Get('me')
  async getProfile(@Req() req: AuthenticatedRequest) {
    const ctx = this.getContext(req);
    return await this.usersService.getProfile(ctx.user.id);
  }

  @Patch('me')
  async updateProfileDetails(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileDetailsRequestDto,
  ) {
    if (data.primaryNumber && !data.dialCode) {
      throw new BadRequestException();
    }
    const ctx = this.getContext(req);
    await this.usersService.updateProfileDetails({
      userId: ctx.user.id,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dialCode: data.dialCode,
      primaryNumber: data.primaryNumber,
    });
    return { status: 'success' };
  }

  @Post('me/profile-image')
  updateProfileImage(
    @Req() req: AuthenticatedRequest,
    @Body() data: UpdateProfileImageRequestDto,
  ) {
    const ctx = this.getContext(req);
    return this.usersService.updateProfileImage(ctx.user.id, data.profileImage);
  }

  @Post('me/change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() data: ChangePasswordRequestDto,
  ) {
    const ctx = this.getContext(req);
    await this.usersService.changePassword(
      ctx.user.id,
      data.oldPassword,
      data.newPassword,
    );
    return { status: 'success' };
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Get(':userId')
  async getUserProfile(@Param('userId') userId: string) {
    return await this.usersService.getProfile(userId);
  }

  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Patch(':userId')
  async updateUserProfileDetails(
    @Param('userId') userId: string,
    @Body() data: UpdateUserProfileRequestDto,
  ) {
    return await this.usersService.updateProfileDetailsByAdministrator({
      userId,
      firstname: data.firstname,
      lastname: data.lastname,
      email: data.email,
      dailCode: data.dialCode,
      primaryNumber: data.primaryNumber,
      password: data.password,
    });
  }

  @ApiParam({ name: 'status', enum: UserStatus })
  @Roles(UserType.Admin)
  @UseGuards(RolesGuard)
  @Post(':userId/:status')
  async setUserStatus(
    @Param('userId') userId: string,
    @Param('status', new ParseEnumPipe(UserStatus)) status: UserStatus,
  ) {
    await this.usersService.setStatus(userId, status);
    return { status: 'success' };
  }
}
