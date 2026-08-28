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

  describe('findUnpaid', () => {
    it('sin query: solo filtra por is_paid, sin parámetros extra', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.findUnpaid('');

      const calls = queryMock.mock.calls as [string, unknown[]][];
      const [sql, params] = calls[0];
      expect(sql).toContain('WHERE is_paid IS NOT TRUE');
      expect(sql).not.toContain('name ILIKE');
      expect(params).toEqual([]);
    });

    it('query solo con texto: filtra por nombre', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.findUnpaid('Juan');

      const calls = queryMock.mock.calls as [string, unknown[]][];
      const [sql, params] = calls[0];
      expect(sql).toContain('name ILIKE $1');
      expect(sql).not.toContain('wallet_number LIKE');
      expect(params).toEqual(['%Juan%']);
    });

    it('query con dígitos: filtra por nombre O prefijo de cartera', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.findUnpaid('120');

      const calls = queryMock.mock.calls as [string, unknown[]][];
      const [sql, params] = calls[0];
      expect(sql).toContain('name ILIKE $1 OR wallet_number LIKE $2');
      expect(params).toEqual(['%120%', '120']);
    });

    it('query mixta (texto + dígitos): extrae solo los dígitos para el prefijo de cartera', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.findUnpaid('Juan 5');

      const calls = queryMock.mock.calls as [string, unknown[]][];
      const [, params] = calls[0];
      expect(params).toEqual(['%Juan 5%', '5']);
    });

    it('query de solo espacios se trata como vacía', async () => {
      const queryMock = jest.fn().mockResolvedValue({ rows: [] });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      await repository.findUnpaid('   ');

      const calls = queryMock.mock.calls as [string, unknown[]][];
      const [, params] = calls[0];
      expect(params).toEqual([]);
    });

    it('devuelve las filas con wallet_number en snake_case (contrato real de Flutter)', async () => {
      const rows = [
        {
          id: 'uuid-1',
          name: 'Juan',
          wallet_number: '007',
          created_at: new Date(),
        },
      ];
      const queryMock = jest.fn().mockResolvedValue({ rows });
      const pool = { query: queryMock } as unknown as Pool;
      const repository = new ParticipantsRepository(pool);

      expect(await repository.findUnpaid('')).toBe(rows);
    });
  });
});
