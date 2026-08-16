import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { DatabaseError } from 'pg';
import { CryptoService } from '../../common/crypto/crypto.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import {
  CreatedParticipant,
  ParticipantsRepository,
} from './participants.repository';

const UNIQUE_VIOLATION = '23505';
const CHECK_VIOLATION = '23514';
const WALLET_NUMBER_UNIQUE_INDEX = 'idx_participants_wallet_number';
const WALLET_NUMBER_FORMAT_CHECK = 'chk_wallet_number_format';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly participantsRepository: ParticipantsRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(dto: CreateParticipantDto): Promise<CreatedParticipant> {
    try {
      return await this.participantsRepository.create({
        name: dto.name,
        walletNumber: dto.walletNumber,
        photoPublicId: dto.photoPublicId,
        photoVersion: dto.photoVersion,
        phone: dto.phone,
        encryptionKey: this.cryptoService.getEncryptionKey(),
        phoneLast4: this.cryptoService.getLast4Digits(dto.phone),
        phoneHash: this.cryptoService.hashPhone(dto.phone),
      });
    } catch (error) {
      throw this.translateDatabaseError(error, dto.walletNumber);
    }
  }

  private translateDatabaseError(
    error: unknown,
    walletNumber: string,
  ): unknown {
    if (!(error instanceof DatabaseError)) {
      return error;
    }

    if (
      error.code === UNIQUE_VIOLATION &&
      error.constraint === WALLET_NUMBER_UNIQUE_INDEX
    ) {
      return new ConflictException({
        error: 'wallet_already_taken',
        message: `La cartera ${walletNumber} ya está registrada`,
      });
    }

    if (
      error.code === CHECK_VIOLATION &&
      error.constraint === WALLET_NUMBER_FORMAT_CHECK
    ) {
      return new BadRequestException({
        error: 'invalid_wallet_number',
        message:
          'El número de cartera debe ser un string de 3 dígitos entre "001" y "840"',
      });
    }

    return error;
  }
}
