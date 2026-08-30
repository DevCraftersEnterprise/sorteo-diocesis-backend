import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';
import { ExportService } from '../export/export.service';
import {
  ParticipantsRepository,
  UnpaidParticipant,
} from '../participants/participants.repository';

const EXPORT_FILENAME = 'sorteo_export.zip';

export interface PurgeSummary {
  ok: true;
  deletedParticipants: number;
  deletedPhotos: number;
  failedPhotoDeletions: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly participantsRepository: ParticipantsRepository,
    private readonly cryptoService: CryptoService,
    private readonly exportService: ExportService,
    private readonly cloudinaryService: CloudinaryService,
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

  async purgeAll(): Promise<PurgeSummary> {
    // DELETE ... RETURNING atómico en el repositorio: elimina la
    // ventana de condición de carrera que existía en Express entre el
    // SELECT de public_id y el DELETE por separado.
    const { deletedCount, photoPublicIds } =
      await this.participantsRepository.purgeAll();

    let deletedPhotos = 0;
    let failedPhotoDeletions = 0;

    if (photoPublicIds.length) {
      const result =
        await this.cloudinaryService.deletePhotosByPublicIds(photoPublicIds);
      deletedPhotos = result.deletedCount;
      failedPhotoDeletions = result.failedPublicIds.length;

      if (failedPhotoDeletions > 0) {
        // Las filas en Postgres ya se borraron — Cloudinary no puede
        // formar parte de la misma transacción, así que lo más cerca
        // que se puede estar de "compensar" es dejar un reporte
        // detallado de qué public_id quedaron huérfanos (corrige A3).
        this.logger.warn(
          `Purga completada: ${failedPhotoDeletions} de ${photoPublicIds.length} fotos no se pudieron borrar de Cloudinary: ${result.failedPublicIds.join(', ')}`,
        );
      }
    }

    return {
      ok: true,
      deletedParticipants: deletedCount,
      deletedPhotos,
      failedPhotoDeletions,
    };
  }
}
