// add-tracking-event.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsString } from 'class-validator';

export class AddTrackingEventDto {
  @ApiProperty({ example: 'Out for delivery' })
  @IsString()
  eventStatus: string;

  @ApiProperty({ example: 'Mumbai Hub' })
  @IsString()
  location: string;

  @ApiProperty({ example: '2026-03-18T10:00:00.000Z' })
  @IsDateString()
  eventTime: string;
}
