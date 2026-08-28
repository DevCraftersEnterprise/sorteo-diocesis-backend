import { Module } from '@nestjs/common';
import { ParticipantsRepository } from './participants.repository';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { ParticipantsService } from './participants.service';
import { ParticipantsController } from './participants.controller';
import { FirebaseAuthModule } from '../../common/guards/firebase-auth.module';

@Module({
  imports: [CryptoModule, FirebaseAuthModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsRepository, ParticipantsService],
  exports: [ParticipantsRepository, ParticipantsService],
})
export class ParticipantsModule {}
