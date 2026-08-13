import { App } from 'firebase-admin/app';
import * as firebaseAuth from 'firebase-admin/auth';
import { FirebaseAdminService } from './firebase-admin.service';

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(),
}));

describe('FirebaseAdminService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('delega verifyIdToken en la instancia de Auth de la app inyectada', async () => {
    const verifyIdTokenMock = jest.fn().mockResolvedValue({ uid: 'user-123' });
    (firebaseAuth.getAuth as jest.Mock).mockReturnValue({
      verifyIdToken: verifyIdTokenMock,
    });

    const fakeApp = { name: '[DEFAULT]' } as unknown as App;
    const service = new FirebaseAdminService(fakeApp);

    const result = await service.verifyIdToken('some-token');

    expect(firebaseAuth.getAuth).toHaveBeenCalledWith(fakeApp);
    expect(verifyIdTokenMock).toHaveBeenCalledWith('some-token');
    expect(result).toEqual({ uid: 'user-123' });
  });
});
