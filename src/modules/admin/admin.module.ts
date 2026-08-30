import { Module } from '@nestjs/common';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { FirebaseAuthModule } from '../../common/guards/firebase-auth.module';
import { ExportModule } from '../export/export.module';
import { ParticipantsModule } from '../participants/participants.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ParticipantsModule, FirebaseAuthModule, ExportModule, CryptoModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
