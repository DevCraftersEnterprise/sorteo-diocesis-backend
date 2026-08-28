import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import archiver, { Archiver } from 'archiver';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { CloudinaryService } from '../../integrations/cloudinary/cloudinary.service';

export interface ExportParticipantRow {
  name: string;
  walletNumber: string;
  phoneFull: string;
  photoPublicId: string | null;
  createdAt: Date;
  isPaid: boolean;
  paidAt: Date | null;
  markedByEmail: string | null;
}

const PHOTO_URL_TTL_SECONDS = 180;
const PHOTO_FETCH_CONCURRENCY = 10;

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  async streamZipWithExcelAndPhotos(
    rows: ExportParticipantRow[],
    response: Response,
  ): Promise<void> {
    const workbook = this.buildWorkbook(rows);
    const excelBuffer = await workbook.xlsx.writeBuffer();

    const archive = archiver('zip', { zlib: { level: 9 } });

    // Corrige BUG-004/C3: el Express original hacía
    // `archive.on('error', (err) => { throw err })`, un throw síncrono
    // dentro de un listener de EventEmitter que podía tirar el
    // proceso completo para TODOS los requests, no solo el que
    // exportaba. Acá se responde con un error controlado si los
    // headers no se han enviado, o se destruye el stream de forma
    // segura si la respuesta ya empezó — nunca se relanza el error.
    archive.on('error', (err: Error) => {
      this.logger.error('Error generando el ZIP de exportación', err.stack);
      if (!response.headersSent) {
        response.status(500).json({
          statusCode: 500,
          error: 'export_failed',
          message: 'No se pudo generar el archivo de exportación',
        });
      } else {
        response.destroy(err);
      }
    });

    archive.pipe(response);
    archive.append(Buffer.from(excelBuffer), { name: 'sorteo.xlsx' });

    await this.appendPhotos(archive, rows);

    await archive.finalize();
  }

  private buildWorkbook(rows: ExportParticipantRow[]): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sorteo');

    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'Cartera', key: 'wallet', width: 16 },
      { header: 'Teléfono', key: 'phone', width: 22 },
      { header: 'Fecha', key: 'date', width: 24 },
      { header: 'Pagado', key: 'isPaid', width: 10 },
      { header: 'Fecha de Pago', key: 'paidAt', width: 24 },
      { header: 'Marcado por', key: 'markedByEmail', width: 30 },
    ];

    for (const row of rows) {
      worksheet.addRow({
        name: row.name,
        wallet: row.walletNumber,
        phone: row.phoneFull,
        date: this.formatDate(row.createdAt),
        isPaid: row.isPaid ? 'Sí' : 'No',
        paidAt: row.paidAt ? this.formatDate(row.paidAt) : '',
        markedByEmail: row.markedByEmail ?? '',
      });
    }

    return workbook;
  }

  private async appendPhotos(
    archive: Archiver,
    rows: ExportParticipantRow[],
  ): Promise<void> {
    const withPhoto = rows.filter((row) => row.photoPublicId);

    // Corrige M6: el Express original bajaba las fotos una por una en
    // secuencia — con muchos participantes, eso podía tardar lo
    // suficiente como para que la URL firmada (180s) expirara antes
    // de llegar a las últimas fotos. Acá se bajan con concurrencia
    // acotada (10 a la vez), no ilimitada (para no saturar Cloudinary)
    // ni una por una.
    await this.mapWithConcurrency(
      withPhoto,
      PHOTO_FETCH_CONCURRENCY,
      async (row) => {
        const url = this.cloudinaryService.signedPhotoUrl(
          row.photoPublicId as string,
          PHOTO_URL_TTL_SECONDS,
        );
        const buffer = await this.fetchBuffer(url);

        if (buffer) {
          const base = `${this.safeName(row.walletNumber)}-${this.safeName(row.name)}`;
          archive.append(buffer, { name: `fotos/${base}.jpg` });
        }
      },
    );
  }

  private async fetchBuffer(url: string): Promise<Buffer | null> {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private safeName(value: string | null | undefined): string {
    return String(value ?? '').replace(/[^a-zA-Z0-9-_]/g, '_');
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleString('es-MX', {
      timeZone: this.configService.get<string>('timezone'),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  private async mapWithConcurrency<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>,
  ): Promise<void> {
    let index = 0;

    const run = async (): Promise<void> => {
      while (index < items.length) {
        const current = index++;
        await worker(items[current]);
      }
    };

    const runners = Array.from({ length: Math.min(limit, items.length) }, () =>
      run(),
    );
    await Promise.all(runners);
  }
}
