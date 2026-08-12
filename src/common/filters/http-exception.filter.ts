import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';

export interface ErrorResponseBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
  requestId: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const { statusCode, error, message } =
      this.resolveExceptionShape(exception);

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.id}] ${request.method} ${request.originalUrl} -> ${statusCode} ${this.detailsForLog(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    const body: ErrorResponseBody = {
      statusCode,
      error,
      message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };

    response.status(statusCode).json(body);
  }

  private resolveExceptionShape(exception: unknown): {
    statusCode: number;
    error: string;
    message: string | string[];
  } {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const payload = exception.getResponse();

      if (typeof payload === 'string') {
        return {
          statusCode,
          error: this.toSnakeCode(this.reasonPhrase(statusCode)),
          message: payload,
        };
      }

      const { error, message } = payload as {
        error?: unknown;
        message?: unknown;
      };

      return {
        statusCode,
        error: this.toSnakeCode(
          typeof error === 'string' ? error : this.reasonPhrase(statusCode),
        ),
        message:
          typeof message === 'string' || Array.isArray(message)
            ? (message as string | string[])
            : exception.message,
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'internal_server_error',
      message: 'Ocurrió un error inesperado',
    };
  }

  private reasonPhrase(statusCode: number): string {
    return STATUS_CODES[statusCode] ?? 'Error';
  }

  private toSnakeCode(text: string): string {
    return text
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private detailsForLog(exception: unknown): string {
    if (exception instanceof HttpException) {
      const payload = exception.getResponse();
      return typeof payload === 'string' ? payload : JSON.stringify(payload);
    }
    return exception instanceof Error ? exception.message : String(exception);
  }
}
