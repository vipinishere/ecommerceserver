import { IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartRequestDto {
  @IsInt()
  @Min(1)
  @Max(10)
  @Type(() => Number)
  quantity: number;
}
