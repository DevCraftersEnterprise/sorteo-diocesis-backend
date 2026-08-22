import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
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

  it('permite el acceso con un token válido que trae el claim admin:true', async () => {
    const decoded = {
      uid: 'user-123',
      email: 'admin@example.com',
      admin: true,
    };
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
    expect(request.user).toBe(decoded);
  });

  it('lanza ForbiddenException si el token es válido pero no trae el claim admin — corrige C2', async () => {
    const decoded = { uid: 'user-sin-admin', email: 'user@example.com' };
    const verifyIdTokenMock = jest.fn().mockResolvedValue(decoded);
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({
      authorization: 'Bearer valid-token-sin-claim',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('lanza ForbiddenException si admin está presente pero en false', async () => {
    const decoded = { uid: 'user-123', admin: false };
    const verifyIdTokenMock = jest.fn().mockResolvedValue(decoded);
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({ authorization: 'Bearer token' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('ya NO permite el acceso solo por tener un token válido sin rol (confirma que C2 quedó corregido)', async () => {
    const decoded = { uid: 'cualquier-usuario-autenticado' };
    const verifyIdTokenMock = jest.fn().mockResolvedValue(decoded);
    const firebaseAdminService = {
      verifyIdToken: verifyIdTokenMock,
    } as unknown as FirebaseAdminService;
    const guard = new FirebaseAuthGuard(firebaseAdminService);
    const { context } = buildContext({
      authorization: 'Bearer any-valid-token',
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
