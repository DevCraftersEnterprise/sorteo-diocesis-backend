import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { DecodedIdToken } from 'firebase-admin/auth';
import { FirebaseAdminService } from '../../integrations/firebase/firebase-admin.service';

export interface RequestWithUser extends Request {
  user?: DecodedIdToken;
}

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(private readonly firebaseAdminService: FirebaseAdminService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Falta el token de autenticación',
      });
    }

    let decoded: DecodedIdToken;
    try {
      decoded = await this.firebaseAdminService.verifyIdToken(token);
    } catch {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Token inválido o expirado',
      });
    }

    if (decoded.admin !== true) {
      throw new ForbiddenException({
        error: 'forbidden',
        message: 'La cuenta no tiene permisos de administrador',
      });
    }

    request.user = decoded;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
