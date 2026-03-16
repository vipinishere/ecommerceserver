// address.response.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressResponse {
  @ApiProperty({ example: 'uuid-here' })
  id: string;

  @ApiProperty({ example: 'uuid-here' })
  userId: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '+91' })
  dialCode: string;

  @ApiProperty({ example: '9876543210' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: '9876543210' })
  alternativePhoneNumber: string | null;

  @ApiProperty({ example: '123 Main Street' })
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near Park' })
  addressLine2: string | null;

  @ApiProperty({ example: 'Mumbai' })
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  state: string;

  @ApiProperty({ example: '400001' })
  postalCode: string;

  @ApiProperty({ example: 'India' })
  country: string;

  @ApiProperty({ example: false })
  isDefault: boolean;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt: Date;
}
