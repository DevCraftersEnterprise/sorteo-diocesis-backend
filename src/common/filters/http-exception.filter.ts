import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { RequestWithId } from '../middleware/request-id.middleware';
import { STATUS_CODES } from 'node:http';

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
        `[${request.id}] ${request.method} ${request.originalUrl} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
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
        error?: string;
        message?: string | string[];
      };

      return {
        statusCode,
        error: this.toSnakeCode(error ?? this.reasonPhrase(statusCode)),
        message: message ?? exception.message,
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
}
