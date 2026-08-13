import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { FIREBASE_ADMIN_APP } from './firebase.constants';

export const firebaseAdminProvider: Provider = {
  provide: FIREBASE_ADMIN_APP,
  inject: [ConfigService],
  useFactory: (configService: ConfigService): App => {
    // Mismo guard que el Express original (if (!admin.apps.length)):
    // evita el error "app already exists" si el provider se construye
    // más de una vez (ej. en tests o hot-reload).
    const existing = getApps();
    if (existing.length) {
      return existing[0];
    }

    return initializeApp({
      credential: cert({
        projectId: configService.get<string>('firebase.projectId'),
        clientEmail: configService.get<string>('firebase.clientEmail'),
        privateKey: configService.get<string>('firebase.privateKey'),
      }),
    });
  },
};
