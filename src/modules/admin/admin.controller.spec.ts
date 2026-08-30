import { BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { MarkPaidDto } from './dto/mark-paid.dto';

describe('AdminController', () => {
  it('usa el email del token verificado, ignorando adminEmail suplantado en el body (BUG-002)', async () => {
    const markAsPaidMock = jest.fn().mockResolvedValue(undefined);
    const service = { markAsPaid: markAsPaidMock } as unknown as AdminService;
    const controller = new AdminController(service);
    const dto: MarkPaidDto = {
      walletNumber: '007',
      adminEmail: 'suplantado@evil.com',
    };

    const result = await controller.markAsPaid(dto, 'admin-real@example.com');

    expect(markAsPaidMock).toHaveBeenCalledWith(
      '007',
      'admin-real@example.com',
    );
    expect(result).toEqual({ ok: true });
  });

  it('delega en AdminService.findUnpaid con el query param q', async () => {
    const rows = [
      {
        id: 'uuid-1',
        name: 'Juan',
        wallet_number: '007',
        created_at: new Date(),
      },
    ];
    const findUnpaidMock = jest.fn().mockResolvedValue(rows);
    const service = { findUnpaid: findUnpaidMock } as unknown as AdminService;
    const controller = new AdminController(service);

    const result = await controller.findUnpaid({ q: 'Juan' });

    expect(findUnpaidMock).toHaveBeenCalledWith('Juan');
    expect(result).toBe(rows);
  });

  it('usa string vacío si no se manda q', async () => {
    const findUnpaidMock = jest.fn().mockResolvedValue([]);
    const service = { findUnpaid: findUnpaidMock } as unknown as AdminService;
    const controller = new AdminController(service);

    await controller.findUnpaid({});

    expect(findUnpaidMock).toHaveBeenCalledWith('');
  });

  it('delega en AdminService.exportZip pasando el response crudo', async () => {
    const exportZipMock = jest.fn().mockResolvedValue(undefined);
    const service = { exportZip: exportZipMock } as unknown as AdminService;
    const controller = new AdminController(service);
    const response = {} as unknown as Response;

    await controller.exportZip(response);

    expect(exportZipMock).toHaveBeenCalledWith(response);
  });

  describe('purgeAll', () => {
    it('rechaza con 400 si falta el header X-Confirm-Purge', async () => {
      const purgeAllMock = jest.fn();
      const service = { purgeAll: purgeAllMock } as unknown as AdminService;
      const controller = new AdminController(service);

      await expect(controller.purgeAll(undefined)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(purgeAllMock).not.toHaveBeenCalled();
    });

    it('rechaza con 400 si el header trae un valor distinto de "yes"', async () => {
      const purgeAllMock = jest.fn();
      const service = { purgeAll: purgeAllMock } as unknown as AdminService;
      const controller = new AdminController(service);

      await expect(controller.purgeAll('no')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(purgeAllMock).not.toHaveBeenCalled();
    });

    it('delega en AdminService.purgeAll cuando el header viene en "yes" (corrige BUG-001)', async () => {
      const summary = {
        ok: true as const,
        deletedParticipants: 3,
        deletedPhotos: 3,
        failedPhotoDeletions: 0,
      };
      const purgeAllMock = jest.fn().mockResolvedValue(summary);
      const service = { purgeAll: purgeAllMock } as unknown as AdminService;
      const controller = new AdminController(service);

      const result = await controller.purgeAll('yes');

      expect(purgeAllMock).toHaveBeenCalled();
      expect(result).toBe(summary);
    });
  });
});
