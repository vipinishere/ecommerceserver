import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from './create-address-request.dto';

export class UpdateAddressRequestDto extends PartialType(CreateAddressDto) {}
