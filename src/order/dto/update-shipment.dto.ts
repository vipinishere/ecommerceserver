// update-shipment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { ShipmentStatus } from 'src/generated/prisma/enums';

export class UpdateShipmentDto {
  @ApiProperty({ enum: ShipmentStatus })
  @IsEnum(ShipmentStatus)
  status: ShipmentStatus;

  @ApiPropertyOptional({ example: 'TRACK123' })
  @IsOptional()
  @IsString()
  trackingNumber?: string;

  @ApiPropertyOptional({ example: 'Delhivery' })
  @IsOptional()
  @IsString()
  carrier?: string;

  @ApiPropertyOptional({ example: '2026-03-20T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  estimatedDelivery?: string;
}
