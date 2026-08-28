import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsWalletNumber } from '../../../common/validators/is-wallet-number.validator';

export class MarkPaidDto {
  @ApiProperty({
    example: '007',
    description: 'String de 3 dígitos, entre "001" y "840"',
  })
  @IsWalletNumber()
  walletNumber!: string;

  @ApiPropertyOptional({
    description:
      'Ignorado deliberadamente — la identidad real se deriva del token verificado (@CurrentUser), nunca de este campo. Se acepta solo por compatibilidad con el cliente actual, que todavía lo envía (BUG-002).',
  })
  @IsOptional()
  @IsString()
  adminEmail?: string;
}
