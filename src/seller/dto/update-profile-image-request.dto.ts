import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateSellerProfileImageRequestDto {
  @ApiProperty({ example: 'profile-image.jpg' })
  @IsString()
  @IsNotEmpty()
  profileImage: string;
}
