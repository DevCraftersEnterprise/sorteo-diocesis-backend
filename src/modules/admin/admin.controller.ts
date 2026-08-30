import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { UnpaidParticipant } from '../participants/participants.repository';
import { AdminService, PurgeSummary } from './admin.service';
import { FindUnpaidQueryDto } from './dto/find-unpaid-query.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';

const CONFIRM_PURGE_HEADER = 'x-confirm-purge';
const CONFIRM_PURGE_VALUE = 'yes';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(FirebaseAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Put('mark-paid')
  @ApiOperation({
    summary: 'Marca una cartera como pagada',
    description:
      'Requiere token admin. El email de quién marcó se deriva del token verificado, nunca del body (corrige BUG-002).',
  })
  async markAsPaid(
    @Body() dto: MarkPaidDto,
    @CurrentUser('email') adminEmail: string,
  ): Promise<{ ok: true }> {
    await this.adminService.markAsPaid(dto.walletNumber, adminEmail);
    return { ok: true };
  }

  @Get('unpaid')
  @ApiOperation({
    summary: 'Lista carteras sin pagar, con búsqueda opcional',
    description:
      'Requiere token admin. Respuesta en snake_case (wallet_number) — contrato preservado porque el cliente Flutter lo consume directo.',
  })
  findUnpaid(@Query() query: FindUnpaidQueryDto): Promise<UnpaidParticipant[]> {
    return this.adminService.findUnpaid(query.q ?? '');
  }

  @Get('export')
  @ApiOperation({
    summary: 'Exporta participantes a Excel + fotos en un ZIP',
    description:
      'Requiere token admin. Streaming directo de la respuesta — no pasa por el envoltorio JSON habitual del resto de la API.',
  })
  async exportZip(@Res() response: Response): Promise<void> {
    await this.adminService.exportZip(response);
  }

  @Post('purge')
  @ApiOperation({
    summary: 'Borra todos los participantes y sus fotos en Cloudinary',
    description:
      'Requiere token admin y el header "X-Confirm-Purge: yes". Corrige BUG-001: el cliente Flutter siempre envió POST, nunca DELETE.',
  })
  async purgeAll(
    @Headers(CONFIRM_PURGE_HEADER) confirmHeader: string | undefined,
  ): Promise<PurgeSummary> {
    if (confirmHeader !== CONFIRM_PURGE_VALUE) {
      throw new BadRequestException({
        error: 'purge_not_confirmed',
        message: `Falta el header ${CONFIRM_PURGE_HEADER}: ${CONFIRM_PURGE_VALUE}`,
      });
    }

    return this.adminService.purgeAll();
  }
}
