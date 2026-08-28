import { Injectable, NotFoundException } from '@nestjs/common';
import { ParticipantsRepository } from '../participants/participants.repository';

@Injectable()
export class AdminService {
  constructor(
    private readonly participantsRepository: ParticipantsRepository,
  ) {}

  async markAsPaid(walletNumber: string, adminEmail: string): Promise<void> {
    const updated = await this.participantsRepository.markAsPaid(
      walletNumber,
      adminEmail,
    );

    if (!updated) {
      throw new NotFoundException({
        error: 'participant_not_found',
        message: `No existe ningún participante con la cartera ${walletNumber}`,
      });
    }
  }
}
