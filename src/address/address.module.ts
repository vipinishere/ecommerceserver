import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';

@Module({
  imports: [PrismaModule],
  providers: [AddressService],
  controllers: [AddressController],
  exports: [AddressService],
})
export class AddressModule {}
