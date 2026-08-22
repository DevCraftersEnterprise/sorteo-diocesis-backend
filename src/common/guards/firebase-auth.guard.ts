import {
  CanActivate,
  ExecutionContext,
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

    try {
      const decoded = await this.firebaseAdminService.verifyIdToken(token);
      // Comportamiento actual (Express, requireAdmin.js): cualquier
      // token válido pasa, sin verificar ningún rol — hallazgo
      // CRÍTICO C2 del dossier. Se corrige deliberadamente en la
      // Tarea 4.2, no en esta.
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'unauthorized',
        message: 'Token inválido o expirado',
      });
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
