import { Module } from '@nestjs/common';
import { FirebaseAuthModule } from '../../common/guards/firebase-auth.module';
import { ParticipantsModule } from '../participants/participants.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ParticipantsModule, FirebaseAuthModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
