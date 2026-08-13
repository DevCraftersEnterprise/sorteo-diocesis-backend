import { FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App } from 'firebase-admin/app';
import * as firebaseApp from 'firebase-admin/app';
import { firebaseAdminProvider } from './firebase.provider';

jest.mock('firebase-admin/app', () => ({
  getApps: jest.fn(),
  initializeApp: jest.fn(),
  cert: jest.fn(),
}));

function buildConfigService(): ConfigService {
  const values: Record<string, string> = {
    'firebase.projectId': 'demo-project',
    'firebase.clientEmail': 'svc@demo-project.iam.gserviceaccount.com',
    'firebase.privateKey':
      '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
  };
  const getMock = jest.fn((key: string) => values[key]);
  return { get: getMock } as unknown as ConfigService;
}

describe('firebaseAdminProvider', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('inicializa la app con las credenciales del ConfigService cuando no existe ninguna', () => {
    (firebaseApp.getApps as jest.Mock).mockReturnValue([]);
    (firebaseApp.cert as jest.Mock).mockReturnValue('fake-credential');
    const fakeApp = { name: '[DEFAULT]' } as unknown as App;
    (firebaseApp.initializeApp as jest.Mock).mockReturnValue(fakeApp);

    const provider = firebaseAdminProvider as FactoryProvider<App>;
    const result = provider.useFactory(buildConfigService());

    expect(firebaseApp.cert).toHaveBeenCalledWith({
      projectId: 'demo-project',
      clientEmail: 'svc@demo-project.iam.gserviceaccount.com',
      privateKey:
        '-----BEGIN PRIVATE KEY-----\nfake\n-----END PRIVATE KEY-----\n',
    });
    expect(firebaseApp.initializeApp).toHaveBeenCalledWith({
      credential: 'fake-credential',
    });
    expect(result).toBe(fakeApp);
  });

  it('reutiliza la app existente en vez de inicializar de nuevo', () => {
    const existingApp = { name: '[DEFAULT]' } as unknown as App;
    (firebaseApp.getApps as jest.Mock).mockReturnValue([existingApp]);

    const provider = firebaseAdminProvider as FactoryProvider<App>;
    const result = provider.useFactory(buildConfigService());

    expect(firebaseApp.initializeApp).not.toHaveBeenCalled();
    expect(result).toBe(existingApp);
  });
});
