import { Pool } from 'pg';
import { ParticipantsRepository } from './participants.repository';

describe('ParticipantsRepository', () => {
  describe('create', () => {
    it('inserta con los parámetros correctos y devuelve id/createdAt', async () => {
      const createdAt = new Date('2026-01-01T00:00:00Z');
      const queryMock = jest.fn().mockResolvedValue({
        rows: [{ id: 'uuid-123', created_at: createdAt }],
      });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      const result = await repository.create({
        name: 'Juan Pérez',
        walletNumber: '007',
        photoPublicId: 'ine-photos/abc',
        photoVersion: '123',
        phone: '6441234567',
        encryptionKey: '0123456789abcdef',
        phoneLast4: '4567',
        phoneHash: 'hash-value',
      });

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO participants'),
        [
          'Juan Pérez',
          '007',
          'ine-photos/abc',
          '123',
          '6441234567',
          '0123456789abcdef',
          '4567',
          'hash-value',
        ],
      );
      expect(result).toEqual({ id: 'uuid-123', createdAt });
    });

    it('usa null como photoVersion cuando no se manda', async () => {
      const queryMock = jest.fn().mockResolvedValue({
        rows: [{ id: 'uuid-1', created_at: new Date() }],
      });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.create({
        name: 'Ana',
        walletNumber: '008',
        photoPublicId: 'ine-photos/def',
        phone: '6449999999',
        encryptionKey: 'key',
        phoneLast4: '9999',
        phoneHash: 'hash',
      });

      const calls = queryMock.mock.calls as unknown[][];
      const params = calls[0][1] as unknown[];
      expect(params[3]).toBeNull();
    });
  });

  describe('findAllMasked', () => {
    it('mapea las filas de participants_masked a camelCase', async () => {
      const queryMock = jest.fn().mockResolvedValue({
        rows: [
          {
            id: 'uuid-1',
            name: 'Juan',
            wallet_number: '007',
            photo_public_id: 'ine-photos/abc',
            photo_version: null,
            phone_masked: '***_***_4567',
            created_at: new Date('2026-01-01'),
          },
        ],
      });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      const result = await repository.findAllMasked();

      expect(queryMock).toHaveBeenCalledWith(
        'SELECT * FROM participants_masked',
      );
      expect(result).toEqual([
        {
          id: 'uuid-1',
          name: 'Juan',
          walletNumber: '007',
          photoPublicId: 'ine-photos/abc',
          photoVersion: null,
          phoneMasked: '***_***_4567',
          createdAt: new Date('2026-01-01'),
        },
      ]);
    });
  });

  describe('walletExists', () => {
    it('devuelve true si la cartera ya existe', async () => {
      const queryMock = jest
        .fn()
        .mockResolvedValue({ rows: [{ '?column?': 1 }] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      const result = await repository.walletExists('007');

      expect(queryMock).toHaveBeenCalledWith(
        'SELECT 1 FROM participants WHERE wallet_number = $1 LIMIT 1',
        ['007'],
      );
      expect(result).toBe(true);
    });

    it('devuelve false si la cartera no existe', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      expect(await repository.walletExists('999')).toBe(false);
    });
  });

  describe('markAsPaid', () => {
    it('actualiza la cartera y devuelve true si afectó una fila', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rowCount: 1 });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      const result = await repository.markAsPaid('007', 'admin@example.com');

      expect(queryMock).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE participants'),
        ['admin@example.com', '007'],
      );
      expect(result).toBe(true);
    });

    it('devuelve false si no existe la cartera (0 filas afectadas)', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rowCount: 0 });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      expect(await repository.markAsPaid('999', 'admin@example.com')).toBe(
        false,
      );
    });
  });
});
