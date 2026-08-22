import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';
import { RequestWithUser } from '../guards/firebase-auth.guard';

export function currentUserFactory(
  data: keyof DecodedIdToken | undefined,
  ctx: ExecutionContext,
): unknown {
  const request = ctx.switchToHttp().getRequest<RequestWithUser>();
  const user = request.user;

  if (!user) {
    throw new InternalServerErrorException(
      '@CurrentUser() usado en una ruta sin FirebaseAuthGuard',
    );
  }

  return data ? (user[data] as unknown) : user;
}

export const CurrentUser = createParamDecorator(currentUserFactory);
