import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ValidateWalletQueryDto } from './dto/validate-wallet.query.dto';
import { WalletAvailability, WalletService } from './wallet.service';

@ApiTags('wallet')
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('validate')
  @ApiOperation({
    summary: 'Verifica si un número de cartera está disponible',
    description:
      'Público, sin autenticación. No valida formato/rango (se centraliza en la Etapa 3). ' +
      'Existe una condición de carrera conocida frente a la creación real del participante — documentada, no corregida en esta tarea.',
  })
  validate(
    @Query() query: ValidateWalletQueryDto,
  ): Promise<WalletAvailability> {
    return this.walletService.checkAvailability(query.wallet);
  }
}
