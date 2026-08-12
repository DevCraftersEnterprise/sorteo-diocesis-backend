import {
  ArgumentsHost,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ErrorResponseBody,
  HttpExceptionFilter,
} from './http-exception.filter';
import { RequestWithId } from '../middleware/request-id.middleware';

function buildHost(
  overrides: { method?: string; originalUrl?: string; id?: string } = {},
) {
  const request = {
    method: overrides.method ?? 'GET',
    originalUrl: overrides.originalUrl ?? '/test',
    id: overrides.id ?? 'req-1',
  } as RequestWithId;

  const status = jest.fn().mockReturnThis();
  const json = jest.fn().mockReturnThis();
  const response = { status, json } as unknown as Response;

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ArgumentsHost;

  return { host, status, json };
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('convierte una excepción sin mensaje personalizado usando la frase estándar del status', () => {
    const { host, status, json } = buildHost({
      originalUrl: '/participants/1',
    });
    filter.catch(new NotFoundException(), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'not_found',
        message: 'Not Found',
        path: '/participants/1',
      }),
    );
  });

  it('usa el mensaje personalizado cuando se pasa un string, con el código derivado del status', () => {
    const { host, json } = buildHost();
    filter.catch(new NotFoundException('Participante no encontrado'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        error: 'not_found',
        message: 'Participante no encontrado',
      }),
    );
  });

  it('preserva un código de negocio explícito pasado como objeto', () => {
    const { host, json } = buildHost();
    filter.catch(
      new ConflictException({
        error: 'wallet_already_taken',
        message: 'La cartera ya fue tomada',
      }),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        error: 'wallet_already_taken',
        message: 'La cartera ya fue tomada',
      }),
    );
  });

  it('preserva el arreglo de mensajes del ValidationPipe, sin aplanarlo', () => {
    const { host, json } = buildHost();
    filter.catch(
      new BadRequestException([
        'name should not be empty',
        'walletNumber must be a string',
      ]),
      host,
    );

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        error: 'bad_request',
        message: ['name should not be empty', 'walletNumber must be a string'],
      }),
    );
  });

  it('convierte cualquier excepción no controlada en un 500 genérico, sin exponer detalles internos', () => {
    const { host, status, json } = buildHost();
    filter.catch(new Error('pgp_sym_decrypt failed: bad key'), host);

    expect(status).toHaveBeenCalledWith(500);
    const calls = json.mock.calls as ErrorResponseBody[][];
    const body = calls[0][0];
    expect(body).toMatchObject({
      statusCode: 500,
      error: 'internal_server_error',
      message: 'Ocurrió un error inesperado',
    });
    expect(JSON.stringify(body)).not.toContain('bad key');
  });

  it('loguea con el requestId cualquier error 5xx, para poder correlacionarlo después', () => {
    const { host } = buildHost({ id: 'req-500' });
    filter.catch(new Error('boom'), host);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[req-500]'),
      expect.any(String),
    );
  });

  it('no loguea como error los 4xx (son responsabilidad del cliente, no del servidor)', () => {
    const { host } = buildHost();
    filter.catch(new NotFoundException(), host);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('incluye requestId y timestamp ISO en el cuerpo de la respuesta', () => {
    const { host, json } = buildHost({ id: 'req-xyz' });
    filter.catch(new NotFoundException(), host);

    const calls = json.mock.calls as ErrorResponseBody[][];
    const body = calls[0][0];
    expect(body.requestId).toBe('req-xyz');
    expect(body.timestamp).toEqual(
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });
});
