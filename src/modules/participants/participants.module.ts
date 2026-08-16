import { Module } from '@nestjs/common';
import { ParticipantsRepository } from './participants.repository';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { ParticipantsService } from './participants.service';

@Module({
  imports: [CryptoModule],
  providers: [ParticipantsRepository, ParticipantsService],
  exports: [ParticipantsRepository, ParticipantsService],
})
export class ParticipantsModule {}
