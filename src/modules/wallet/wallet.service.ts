import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { WalletRepository } from './wallet.repository';

export interface WalletAvailability {
  ok: true;
  wallet: string;
}

@Injectable()
export class WalletService {
  constructor(private readonly walletRepository: WalletRepository) {}

  async checkAvailability(
    wallet: string | undefined,
  ): Promise<WalletAvailability> {
    if (!wallet) {
      throw new BadRequestException({
        error: 'invalid_wallet_number',
        message: 'Debes indicar un número de cartera',
      });
    }

    // Nota: no hay lock entre esta lectura y el insert real en
    // /participants (Etapa 3) — dos requests concurrentes pueden ver
    // "disponible" para la misma cartera. La base de datos es la
    // última defensa real (constraint único), esto es solo UX.
    const taken = await this.walletRepository.exists(wallet);
    if (taken) {
      throw new ConflictException({
        error: 'wallet_already_taken',
        message: `La cartera ${wallet} ya está registrada`,
      });
    }

    return { ok: true, wallet };
  }
}
