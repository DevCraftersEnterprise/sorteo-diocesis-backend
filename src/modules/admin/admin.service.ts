import { Injectable, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ExportService } from '../export/export.service';
import {
  ParticipantsRepository,
  UnpaidParticipant,
} from '../participants/participants.repository';

const EXPORT_FILENAME = 'sorteo_export.zip';

@Injectable()
export class AdminService {
  constructor(
    private readonly participantsRepository: ParticipantsRepository,
    private readonly cryptoService: CryptoService,
    private readonly exportService: ExportService,
  ) {}

  async markAsPaid(walletNumber: string, adminEmail: string): Promise<void> {
    const updated = await this.participantsRepository.markAsPaid(
      walletNumber,
      adminEmail,
    );

    if (!updated) {
      throw new NotFoundException({
        error: 'participant_not_found',
        message: `No existe ningún participante con la cartera ${walletNumber}`,
      });
    }
  }

  findUnpaid(query: string): Promise<UnpaidParticipant[]> {
    return this.participantsRepository.findUnpaid(query);
  }

  async exportZip(response: Response): Promise<void> {
    const rows = await this.participantsRepository.findAllForExport(
      this.cryptoService.getEncryptionKey(),
    );

    response.setHeader('Content-Type', 'application/zip');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=${EXPORT_FILENAME}`,
    );

    await this.exportService.streamZipWithExcelAndPhotos(rows, response);
  }
}
