import { Module } from '@nestjs/common';
import { firebaseAdminProvider } from './firebase.provider';
import { FirebaseAdminService } from './firebase-admin.service';

@Module({
  providers: [firebaseAdminProvider, FirebaseAdminService],
  exports: [FirebaseAdminService],
})
export class FirebaseAdminModule {}
