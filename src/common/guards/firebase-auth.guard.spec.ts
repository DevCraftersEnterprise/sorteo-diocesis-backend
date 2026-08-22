import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { FirebaseAdminService } from '../../integrations/firebase/firebase-admin.service';
import { FirebaseAuthGuard, RequestWithUser } from './firebase-auth.guard';

function buildContext(headers: Record<string, string>): {
  context: ExecutionContext;
  request: RequestWithUser;
} {
  const request = { headers } as RequestWithUser;
  const context = {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('FirebaseAuthGuard', () => {
  it('lanza UnauthorizedException si no hay header Authorization', async () => {
    const verifyIdTokenMock = jest.fn();
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({});

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyIdTokenMock).not.toHaveBeenCalled();
  });

  it('lanza UnauthorizedException si el header no tiene el prefijo Bearer', async () => {
    const verifyIdTokenMock = jest.fn();
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({ authorization: 'Token abc123' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('permite el acceso con un token válido y adjunta el usuario decodificado al request', async () => {
    const decoded = { uid: 'user-123', email: 'admin@example.com' };
    const verifyIdTokenMock = jest.fn().mockResolvedValue(decoded);
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context, request } = buildContext({
      authorization: 'Bearer valid-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(verifyIdTokenMock).toHaveBeenCalledWith('valid-token');
    expect(request.user).toBe(decoded);
  });

  it('lanza UnauthorizedException si el token es inválido o expiró', async () => {
    const verifyIdTokenMock = jest
      .fn()
      .mockRejectedValue(new Error('token expirado'));
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({
      authorization: 'Bearer expired-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('documenta el comportamiento actual: cualquier token válido pasa, sin verificar rol (C2 — se corrige en la Tarea 4.2)', async () => {
    const decoded = { uid: 'cualquier-usuario-autenticado' };
    const verifyIdTokenMock = jest.fn().mockResolvedValue(decoded);
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({
      authorization: 'Bearer any-valid-token',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
