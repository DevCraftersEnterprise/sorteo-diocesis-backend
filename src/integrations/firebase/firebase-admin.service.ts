import { Inject, Injectable } from '@nestjs/common';
import { App } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import { FIREBASE_ADMIN_APP } from './firebase.constants';

@Injectable()
export class FirebaseAdminService {
  constructor(@Inject(FIREBASE_ADMIN_APP) private readonly app: App) {}

  verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    return getAuth(this.app).verifyIdToken(idToken);
  }
}
