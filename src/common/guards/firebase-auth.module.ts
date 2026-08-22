import { Module } from '@nestjs/common';
import { FirebaseAdminModule } from '../../integrations/firebase/firebase.module';
import { FirebaseAuthGuard } from './firebase-auth.guard';

@Module({
  imports: [FirebaseAdminModule],
  providers: [FirebaseAuthGuard],
  exports: [FirebaseAuthGuard],
})
export class FirebaseAuthModule {}
