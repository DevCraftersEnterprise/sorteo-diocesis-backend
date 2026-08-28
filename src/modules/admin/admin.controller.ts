import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { AdminService } from './admin.service';
import { FindUnpaidQueryDto } from './dto/find-unpaid-query.dto';
import { MarkPaidDto } from './dto/mark-paid.dto';
import { UnpaidParticipant } from '../participants/participants.repository';

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
}
