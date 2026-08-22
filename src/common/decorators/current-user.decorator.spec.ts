import { ExecutionContext, InternalServerErrorException } from '@nestjs/common';
import { RequestWithUser } from '../guards/firebase-auth.guard';
import { currentUserFactory } from './current-user.decorator';

function buildContext(user?: RequestWithUser['user']): ExecutionContext {
  const request = { user } as RequestWithUser;
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('currentUserFactory (@CurrentUser)', () => {
  const decodedUser = {
    uid: 'user-123',
    email: 'admin@example.com',
    admin: true,
  } as RequestWithUser['user'];

  it('devuelve el usuario completo cuando no se pide una propiedad específica', () => {
    const context = buildContext(decodedUser);
    const result = currentUserFactory(undefined, context);
    expect(result).toBe(decodedUser);
  });

  it('devuelve solo la propiedad pedida cuando se especifica', () => {
    const context = buildContext(decodedUser);
    const result = currentUserFactory('email', context);
    expect(result).toBe('admin@example.com');
  });

  it('lanza InternalServerErrorException si no hay usuario en el request (guard no aplicado)', () => {
    const context = buildContext(undefined);
    expect(() => currentUserFactory(undefined, context)).toThrow(
      InternalServerErrorException,
    );
  });
});
