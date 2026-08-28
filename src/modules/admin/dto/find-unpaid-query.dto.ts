import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class FindUnpaidQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra por nombre o prefijo de cartera',
  })
  @IsOptional()
  @IsString()
  q?: string;
}
