import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GetWatchHistoryDto {
  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  userId: string;
}
