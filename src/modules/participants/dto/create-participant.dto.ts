import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsWalletNumber } from '../../../common/validators/is-wallet-number.validator';

export class CreateParticipantDto {
  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  @MinLength(1)
  name!: string;

  @ApiProperty({
    example: '007',
    description: 'String de 3 dígitos, entre "001" y "840"',
  })
  @IsWalletNumber()
  walletNumber!: string;

  @ApiProperty({ example: '6441234567' })
  @IsString()
  @IsNotEmpty()
  phone!: string;

  @ApiProperty({ example: 'ine-photos/abc123' })
  @IsString()
  @IsNotEmpty()
  photoPublicId!: string;

  @ApiPropertyOptional({ example: '1699999999' })
  @IsOptional()
  @IsString()
  photoVersion?: string;
}
