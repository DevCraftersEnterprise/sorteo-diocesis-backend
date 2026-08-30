import { NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { CryptoService } from '../../common/crypto/crypto.service';
import { ExportService } from '../export/export.service';
import { ParticipantsRepository } from '../participants/participants.repository';
import { AdminService } from './admin.service';

function buildDependencies() {
  const markAsPaidMock = jest.fn();
  const findUnpaidMock = jest.fn();
  const findAllForExportMock = jest.fn();
  const repository = {
    markAsPaid: markAsPaidMock,
    findUnpaid: findUnpaidMock,
    findAllForExport: findAllForExportMock,
  } as unknown as ParticipantsRepository;

  const getEncryptionKeyMock = jest.fn().mockReturnValue('0123456789abcdef');
  const crypto = {
    getEncryptionKey: getEncryptionKeyMock,
  } as unknown as CryptoService;

  const streamZipWithExcelAndPhotosMock = jest
    .fn()
    .mockResolvedValue(undefined);
  const exportService = {
    streamZipWithExcelAndPhotos: streamZipWithExcelAndPhotosMock,
  } as unknown as ExportService;

  return {
    repository,
    markAsPaidMock,
    findUnpaidMock,
    findAllForExportMock,
    crypto,
    getEncryptionKeyMock,
    exportService,
    streamZipWithExcelAndPhotosMock,
  };
}

function buildResponse() {
  const setHeaderMock = jest.fn();
  const response = { setHeader: setHeaderMock } as unknown as Response;
  return { response, setHeaderMock };
}

describe('AdminService', () => {
  describe('markAsPaid', () => {
    it('llama al repositorio con la cartera y el email recibido', async () => {
      const { repository, markAsPaidMock, crypto, exportService } =
        buildDependencies();
      markAsPaidMock.mockResolvedValue(true);
      const service = new AdminService(repository, crypto, exportService);

      await service.markAsPaid('007', 'admin@example.com');

      expect(markAsPaidMock).toHaveBeenCalledWith('007', 'admin@example.com');
    });

    it('lanza NotFoundException si la cartera no existe', async () => {
      const { repository, markAsPaidMock, crypto, exportService } =
        buildDependencies();
      markAsPaidMock.mockResolvedValue(false);
      const service = new AdminService(repository, crypto, exportService);

      await expect(
        service.markAsPaid('999', 'admin@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findUnpaid', () => {
    it('delega en el repositorio con la query recibida', async () => {
      const { repository, findUnpaidMock, crypto, exportService } =
        buildDependencies();
      const rows = [
        {
          id: 'uuid-1',
          name: 'Juan',
          wallet_number: '007',
          created_at: new Date(),
        },
      ];
      findUnpaidMock.mockResolvedValue(rows);
      const service = new AdminService(repository, crypto, exportService);

      const result = await service.findUnpaid('Juan');

      expect(findUnpaidMock).toHaveBeenCalledWith('Juan');
      expect(result).toBe(rows);
    });
  });

  describe('exportZip', () => {
    it('pide la clave de cifrado, arma las filas de export y setea los headers correctos', async () => {
      const {
        repository,
        findAllForExportMock,
        crypto,
        getEncryptionKeyMock,
        exportService,
        streamZipWithExcelAndPhotosMock,
      } = buildDependencies();
      const rows = [{ name: 'Juan', walletNumber: '007' }];
      findAllForExportMock.mockResolvedValue(rows);
      const service = new AdminService(repository, crypto, exportService);
      const { response, setHeaderMock } = buildResponse();

      await service.exportZip(response);

      expect(getEncryptionKeyMock).toHaveBeenCalled();
      expect(findAllForExportMock).toHaveBeenCalledWith('0123456789abcdef');
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Type',
        'application/zip',
      );
      expect(setHeaderMock).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=sorteo_export.zip',
      );
      expect(streamZipWithExcelAndPhotosMock).toHaveBeenCalledWith(
        rows,
        response,
      );
    });
  });
});
