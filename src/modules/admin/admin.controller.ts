import { Body, Controller, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { FirebaseAuthGuard } from '../../common/guards/firebase-auth.guard';
import { AdminService } from './admin.service';
import { MarkPaidDto } from './dto/mark-paid.dto';

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
}
