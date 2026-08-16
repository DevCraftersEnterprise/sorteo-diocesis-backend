import { BadRequestException, ConflictException } from '@nestjs/common';
import { DatabaseError } from 'pg';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { ParticipantsRepository } from './participants.repository';
import { ParticipantsService } from './participants.service';

function buildDependencies() {
  const createMock = jest.fn();
  const repository = {
    create: createMock,
  } as unknown as ParticipantsRepository;

  const getEncryptionKeyMock = jest.fn().mockReturnValue('0123456789abcdef');
  const getLast4DigitsMock = jest.fn().mockReturnValue('4567');
  const hashPhoneMock = jest.fn().mockReturnValue('hashed-phone');
  const crypto = {
    getEncryptionKey: getEncryptionKeyMock,
    getLast4Digits: getLast4DigitsMock,
    hashPhone: hashPhoneMock,
  } as unknown as CryptoService;

  return { repository, createMock, crypto };
}

function buildDatabaseError(code: string, constraint: string): DatabaseError {
  const error = new DatabaseError('fake pg error', 0, 'error');
  error.code = code;
  error.constraint = constraint;
  return error;
}

const dto: CreateParticipantDto = {
  name: 'Juan Pérez',
  walletNumber: '007',
  phone: '6441234567',
  photoPublicId: 'ine-photos/abc',
  photoVersion: '123',
};

describe('ParticipantsService', () => {
  describe('create', () => {
    it('llama al repositorio con los valores derivados de CryptoService', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      createMock.mockResolvedValue({ id: 'uuid-1', createdAt: new Date() });
      const service = new ParticipantsService(repository, crypto);

      await service.create(dto);

      expect(createMock).toHaveBeenCalledWith({
        name: 'Juan Pérez',
        walletNumber: '007',
        photoPublicId: 'ine-photos/abc',
        photoVersion: '123',
        phone: '6441234567',
        encryptionKey: '0123456789abcdef',
        phoneLast4: '4567',
        phoneHash: 'hashed-phone',
      });
    });

    it('devuelve el resultado del repositorio tal cual', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      const created = { id: 'uuid-1', createdAt: new Date() };
      createMock.mockResolvedValue(created);
      const service = new ParticipantsService(repository, crypto);

      expect(await service.create(dto)).toBe(created);
    });

    it('traduce 23505 en idx_participants_wallet_number a wallet_already_taken', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      createMock.mockRejectedValue(
        buildDatabaseError('23505', 'idx_participants_wallet_number'),
      );
      const service = new ParticipantsService(repository, crypto);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      createMock.mockRejectedValue(
        buildDatabaseError('23505', 'idx_participants_wallet_number'),
      );
      await expect(service.create(dto)).rejects.toMatchObject({
        response: { error: 'wallet_already_taken' },
      });
    });

    it('traduce 23514 en chk_wallet_number_format a invalid_wallet_number', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      createMock.mockRejectedValue(
        buildDatabaseError('23514', 'chk_wallet_number_format'),
      );
      const service = new ParticipantsService(repository, crypto);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('propaga sin traducir un 23505 de un constraint distinto al esperado', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      const unknownError = buildDatabaseError('23505', 'some_other_constraint');
      createMock.mockRejectedValue(unknownError);
      const service = new ParticipantsService(repository, crypto);

      await expect(service.create(dto)).rejects.toBe(unknownError);
    });

    it('propaga sin traducir errores que no son de Postgres', async () => {
      const { repository, createMock, crypto } = buildDependencies();
      const genericError = new Error('algo más se rompió');
      createMock.mockRejectedValue(genericError);
      const service = new ParticipantsService(repository, crypto);

      await expect(service.create(dto)).rejects.toBe(genericError);
    });
  });
});
