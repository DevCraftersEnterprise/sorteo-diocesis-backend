import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithId } from '../middleware/request-id.middleware';
import { Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithId>();
    const response = httpContext.getResponse<Response>();

    const { method, originalUrl, id } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () =>
          this.logRequest(method, originalUrl, response.statusCode, start, id),
        error: (err: { status?: number }) =>
          this.logRequest(method, originalUrl, err?.status ?? 500, start, id),
      }),
    );
  }

  private logRequest(
    method: string,
    url: string,
    statusCode: number,
    start: number,
    requestId: string,
  ) {
    const durationMs = Date.now() - start;
    this.logger.log(
      `[${requestId}] ${method} ${url} -> ${statusCode} (${durationMs}ms)`,
    );
  }
}
