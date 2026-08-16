import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { PG_POOL } from '../../database/database.constants';

export interface CreateParticipantParams {
  name: string;
  walletNumber: string;
  photoPublicId: string;
  photoVersion?: string | null;
  phone: string;
  encryptionKey: string;
  phoneLast4: string;
  phoneHash: string;
}

export interface CreatedParticipant {
  id: string;
  createdAt: Date;
}

export interface ParticipantMasked {
  id: string;
  name: string;
  walletNumber: string;
  photoPublicId: string;
  photoVersion: string | null;
  phoneMasked: string;
  createdAt: Date;
}

interface ParticipantRow {
  id: string;
  created_at: Date;
}

interface ParticipantMaskedRow {
  id: string;
  name: string;
  wallet_number: string;
  photo_public_id: string;
  photo_version: string | null;
  phone_masked: string;
  created_at: Date;
}

@Injectable()
export class ParticipantsRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async create(params: CreateParticipantParams): Promise<CreatedParticipant> {
    const sql = `
      INSERT INTO participants
        (name, wallet_number, photo_public_id, photo_version,
         phone_enc, phone_last4, phone_hash, created_at)
      VALUES
        ($1, $2, $3, $4,
         pgp_sym_encrypt($5, $6, 'cipher-algo=aes256, compress-algo=1'),
         $7, $8, NOW() AT TIME ZONE 'UTC')
      RETURNING id, created_at
    `;

    const values = [
      params.name,
      params.walletNumber,
      params.photoPublicId,
      params.photoVersion ?? null,
      params.phone,
      params.encryptionKey,
      params.phoneLast4,
      params.phoneHash,
    ];

    const { rows } = await this.pool.query<ParticipantRow>(sql, values);
    return { id: rows[0].id, createdAt: rows[0].created_at };
  }

  async findAllMasked(): Promise<ParticipantMasked[]> {
    const { rows } = await this.pool.query<ParticipantMaskedRow>(
      'SELECT * FROM participants_masked',
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      walletNumber: row.wallet_number,
      photoPublicId: row.photo_public_id,
      photoVersion: row.photo_version,
      phoneMasked: row.phone_masked,
      createdAt: row.created_at,
    }));
  }

  async walletExists(walletNumber: string): Promise<boolean> {
    const { rows } = await this.pool.query(
      'SELECT 1 FROM participants WHERE wallet_number = $1 LIMIT 1',
      [walletNumber],
    );
    return rows.length > 0;
  }
}
