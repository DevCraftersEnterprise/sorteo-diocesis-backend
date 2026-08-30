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

export interface UnpaidParticipant {
  id: string;
  name: string;
  wallet_number: string;
  created_at: Date;
}

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

interface ExportRow {
  name: string;
  wallet_number: string;
  phone_full: string;
  photo_public_id: string | null;
  created_at: Date;
  is_paid: boolean;
  paid_at: Date | null;
  marked_by_email: string | null;
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

  async markAsPaid(
    walletNumber: string,
    markedByEmail: string,
  ): Promise<boolean> {
    const sql = `
      UPDATE participants
      SET is_paid = true, paid_at = NOW() AT TIME ZONE 'UTC', marked_by_email = $1
      WHERE wallet_number = $2
    `;
    const result = await this.pool.query(sql, [markedByEmail, walletNumber]);
    return (result.rowCount ?? 0) > 0;
  }

  async findUnpaid(query = ''): Promise<UnpaidParticipant[]> {
    const params: string[] = [];
    let where = 'WHERE is_paid IS NOT TRUE';

    const trimmed = query.trim();
    if (trimmed) {
      const digits = trimmed.replace(/\D/g, '');
      if (digits) {
        params.push(`%${trimmed}%`, digits);
        where += " AND (name ILIKE $1 OR wallet_number LIKE $2 || '%')";
      } else {
        params.push(`%${trimmed}%`);
        where += ' AND name ILIKE $1';
      }
    }

    const sql = `
      SELECT id, name, wallet_number, created_at
      FROM participants
      ${where}
      ORDER BY wallet_number::int ASC
      LIMIT 500
    `;

    const { rows } = await this.pool.query<UnpaidParticipant>(sql, params);
    return rows;
  }

  async findAllForExport(
    encryptionKey: string,
  ): Promise<ExportParticipantRow[]> {
    const sql = `
      SELECT
        name,
        wallet_number,
        pgp_sym_decrypt(phone_enc, $1)::text AS phone_full,
        photo_public_id,
        created_at,
        is_paid,
        paid_at,
        marked_by_email
      FROM participants
      ORDER BY created_at DESC
    `;

    const { rows } = await this.pool.query<ExportRow>(sql, [encryptionKey]);

    return rows.map((row) => ({
      name: row.name,
      walletNumber: row.wallet_number,
      phoneFull: row.phone_full,
      photoPublicId: row.photo_public_id,
      createdAt: row.created_at,
      isPaid: row.is_paid,
      paidAt: row.paid_at,
      markedByEmail: row.marked_by_email,
    }));
  }
}
