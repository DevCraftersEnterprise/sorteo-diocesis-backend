import { NotFoundException } from '@nestjs/common';
import { ParticipantsRepository } from '../participants/participants.repository';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  describe('markAsPaid', () => {
    it('llama al repositorio con la cartera y el email recibido', async () => {
      const markAsPaidMock = jest.fn().mockResolvedValue(true);
      const repository = {
        markAsPaid: markAsPaidMock,
      } as unknown as ParticipantsRepository;
      const service = new AdminService(repository);

      await service.markAsPaid('007', 'admin@example.com');

      expect(markAsPaidMock).toHaveBeenCalledWith('007', 'admin@example.com');
    });

    it('lanza NotFoundException si la cartera no existe', async () => {
      const markAsPaidMock = jest.fn().mockResolvedValue(false);
      const repository = {
        markAsPaid: markAsPaidMock,
      } as unknown as ParticipantsRepository;
      const service = new AdminService(repository);

      await expect(
        service.markAsPaid('999', 'admin@example.com'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findUnpaid', () => {
    it('delega en el repositorio con la query recibida', async () => {
      const rows = [
        {
          id: 'uuid-1',
          name: 'Juan',
          wallet_number: '007',
          created_at: new Date(),
        },
      ];
      const findUnpaidMock = jest.fn().mockResolvedValue(rows);
      const repository = {
        findUnpaid: findUnpaidMock,
      } as unknown as ParticipantsRepository;
      const service = new AdminService(repository);

      const result = await service.findUnpaid('Juan');

      expect(findUnpaidMock).toHaveBeenCalledWith('Juan');
      expect(result).toBe(rows);
    });
  });
});
