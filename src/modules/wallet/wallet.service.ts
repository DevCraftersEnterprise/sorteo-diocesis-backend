import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { ParticipantsRepository } from '../participants/participants.repository';

export interface WalletAvailability {
  ok: true;
  wallet: string;
}

@Injectable()
export class WalletService {
  constructor(
    private readonly participantsRepository: ParticipantsRepository,
  ) {}

  async checkAvailability(
    wallet: string | undefined,
  ): Promise<WalletAvailability> {
    if (!wallet) {
      throw new BadRequestException({
        error: 'invalid_wallet_number',
        message: 'Debes indicar un número de cartera',
      });
    }

    const taken = await this.participantsRepository.walletExists(wallet);
    if (taken) {
      throw new ConflictException({
        error: 'wallet_already_taken',
        message: `La cartera ${wallet} ya está registrada`,
      });
    }

    return { ok: true, wallet };
  }
}
