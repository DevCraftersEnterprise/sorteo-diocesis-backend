import { Pool } from 'pg';
import { WalletRepository } from './wallet.repository';

describe('WalletRepository', () => {
  it('devuelve true cuando la cartera ya existe', async () => {
    const queryMock = jest
      .fn()
      .mockResolvedValue({ rows: [{ '?column?': 1 }] });
    const pool = { query: queryMock } as unknown as Pool;
    const repository = new WalletRepository(pool);

    const result = await repository.exists('007');

    expect(queryMock).toHaveBeenCalledWith(
      'SELECT 1 FROM participants WHERE wallet_number = $1 LIMIT 1',
      ['007'],
    );
    expect(result).toBe(true);
  });

  it('devuelve false cuando la cartera no existe', async () => {
    const queryMock = jest.fn().mockResolvedValue({ rows: [] });
    const pool = { query: queryMock } as unknown as Pool;
    const repository = new WalletRepository(pool);

    const result = await repository.exists('999');

    expect(result).toBe(false);
  });
});
