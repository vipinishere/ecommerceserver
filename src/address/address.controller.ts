import {
  AccessGuard,
  AuthenticatedUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  UserType,
} from '@Common';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
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
import { AddressService } from './address.service';
import { AddressResponse } from './address.reponse';
import { CreateAddressDto } from './dto/create-address-request.dto';
import { UpdateAddressRequestDto } from './dto/update-address-request.dto';

@ApiTags('Address')
@ApiBearerAuth()
@Roles(UserType.User)
@UseGuards(JwtAuthGuard, AccessGuard, RolesGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // GET /address
  @ApiOperation({ summary: 'get all addresses' })
  @ApiResponse({ status: 200, type: AddressResponse })
  @Get()
  getAll(@Req() req: Request & { user: AuthenticatedUser }) {
    return this.addressService.getAll(req.user.id);
  }

  // GET /address/:addressId
  @ApiOperation({ summary: 'Get single address' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, type: AddressResponse })
  @ApiResponse({ status: 404, description: 'Address not found' })
  @Get(':addressId')
  getById(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('addressId') addressId: string,
  ) {
    return this.addressService.getById(addressId, req.user.id);
  }

  // POST /address
  @ApiOperation({ summary: 'Create new address' })
  @ApiResponse({ status: 201, type: AddressResponse })
  @Post()
  create(
    @Req() req: Request & { user: AuthenticatedUser },
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressService.create(req.user.id, dto);
  }

  // PATCH /address/:addressId
  @ApiOperation({ summary: 'Update address' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, type: AddressResponse })
  @Patch(':addressId')
  update(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressRequestDto,
  ) {
    return this.addressService.update(addressId, req.user.id, dto);
  }

  // PATCH /address/:addressId/default
  @ApiOperation({ summary: 'Set address as default' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, type: AddressResponse })
  @Patch(':addressId/default')
  setDefault(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('addressId') addressId: string,
  ) {
    return this.addressService.setDefault(addressId, req.user.id);
  }

  // DELETE /address/:addressId
  @ApiOperation({ summary: 'Delete address' })
  @ApiParam({ name: 'addressId', description: 'Address ID' })
  @ApiResponse({ status: 200, description: 'Address deleted' })
  @HttpCode(200)
  @Delete(':addressId')
  remove(
    @Req() req: Request & { user: AuthenticatedUser },
    @Param('addressId') addressId: string,
  ) {
    return this.addressService.remove(addressId, req.user.id);
  }
}
