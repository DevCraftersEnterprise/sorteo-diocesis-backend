import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CryptoService {
  constructor(private readonly configService: ConfigService) {}

  getLast4Digits(phone: string | null | undefined): string {
    return (phone ?? '').replace(/\D/g, '').slice(-4);
  }

  hashPhone(phone: string): string {
    const salt = this.configService.get<string>('security.phoneSalt') ?? '';
    return createHash('sha256')
      .update(phone + salt, 'utf8')
      .digest('hex');
  }

  getEncryptionKey(): string {
    return this.configService.get<string>('security.encryptionKey') ?? '';
  }
}
