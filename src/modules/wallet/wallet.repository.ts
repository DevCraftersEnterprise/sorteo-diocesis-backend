import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.constants';

@Injectable()
export class WalletRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async exists(walletNumber: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM participants WHERE wallet_number = $1 LIMIT 1',
      [walletNumber],
    );
    return rows.length > 0;
  }
}
