import { createHash } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

function buildConfigService(
  values: Record<string, string> = {},
): ConfigService {
  const getMock = jest.fn((key: string) => values[key]);
  return { get: getMock } as unknown as ConfigService;
}

describe('CryptoService', () => {
  describe('getLast4Digits', () => {
    it('devuelve los últimos 4 dígitos de un teléfono simple', () => {
      const service = new CryptoService(buildConfigService());
      expect(service.getLast4Digits('6441234567')).toBe('4567');
    });

    it('ignora caracteres no numéricos (espacios, guiones, +52)', () => {
      const service = new CryptoService(buildConfigService());
      expect(service.getLast4Digits('+52 644-123-4567')).toBe('4567');
    });

    it('devuelve el string completo si tiene menos de 4 dígitos', () => {
      const service = new CryptoService(buildConfigService());
      expect(service.getLast4Digits('12')).toBe('12');
    });

    it('devuelve string vacío para null/undefined/vacío', () => {
      const service = new CryptoService(buildConfigService());
      expect(service.getLast4Digits(null)).toBe('');
      expect(service.getLast4Digits(undefined)).toBe('');
      expect(service.getLast4Digits('')).toBe('');
    });
  });

  describe('hashPhone', () => {
    it('genera el mismo hash sha256 hex que se obtendría manualmente con el mismo salt', () => {
      const service = new CryptoService(
        buildConfigService({ 'security.phoneSalt': 'test-salt' }),
      );
      const expected = createHash('sha256')
        .update('6441234567test-salt', 'utf8')
        .digest('hex');

      expect(service.hashPhone('6441234567')).toBe(expected);
    });

    it('es determinístico: mismo teléfono y salt producen siempre el mismo hash', () => {
      const service = new CryptoService(
        buildConfigService({ 'security.phoneSalt': 'test-salt' }),
      );
      expect(service.hashPhone('6441234567')).toBe(
        service.hashPhone('6441234567'),
      );
    });

    it('produce un hash distinto si cambia el salt', () => {
      const withSaltA = new CryptoService(
        buildConfigService({ 'security.phoneSalt': 'salt-a' }),
      );
      const withSaltB = new CryptoService(
        buildConfigService({ 'security.phoneSalt': 'salt-b' }),
      );

      expect(withSaltA.hashPhone('6441234567')).not.toBe(
        withSaltB.hashPhone('6441234567'),
      );
    });

    it('usa string vacío como salt si no está configurado', () => {
      const service = new CryptoService(buildConfigService({}));
      const expected = createHash('sha256')
        .update('6441234567', 'utf8')
        .digest('hex');

      expect(service.hashPhone('6441234567')).toBe(expected);
    });
  });

  describe('getEncryptionKey', () => {
    it('devuelve la clave configurada', () => {
      const service = new CryptoService(
        buildConfigService({ 'security.encryptionKey': '0123456789abcdef' }),
      );
      expect(service.getEncryptionKey()).toBe('0123456789abcdef');
    });
  });
});
