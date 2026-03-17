// update-product.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

// variants aur specifications alag endpoints se manage honge
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['variants', 'specifications'] as const),
) {}
