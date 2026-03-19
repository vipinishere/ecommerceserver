import {
  Body,
  Controller,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma';

@ApiExcludeController()
@Controller()
export class ShipmentController {
  constructor(private readonly prisma: PrismaService) {}
  @Post('webhook/shipment')
  async handleWebhook(
    @Body() body: { awb: string; current_status: string },
    @Query('secret') secret: string,
  ) {
    if (secret !== process.env.SHIPMENT_SECRET) {
      throw new UnauthorizedException('Invalid webhook');
    }

    if (!body.awb || !body.current_status) {
      throw new UnauthorizedException('Invalid Payload');
    }

    return await this.prisma.shipment.update({
      where: { trackingNumber: body.awb },
      data: { status: body.current_status as any },
    });
  }
}
