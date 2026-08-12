import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';

function buildContext(overrides: {
  method?: string;
  originalUrl?: string;
  id?: string;
  statusCode?: number;
}): ExecutionContext {
  const request = {
    method: overrides.method ?? 'GET',
    originalUrl: overrides.originalUrl ?? '/health',
    id: overrides.id ?? 'test-id',
  };
  const response = { statusCode: overrides.statusCode ?? 200 };

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  } as unknown as ExecutionContext;
}

function buildHandler(handle: CallHandler['handle']): CallHandler {
  return { handle };
}

describe('LoggingInterceptor', () => {
  it('should be defined', () => {
    expect(new LoggingInterceptor()).toBeDefined();
  });

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('loguea método, ruta, status y requestId en una respuesta exitosa', (done) => {
    const interceptor = new LoggingInterceptor();
    const context = buildContext({
      method: 'GET',
      originalUrl: '/health',
      id: 'abc-123',
      statusCode: 200,
    });
    const handler = buildHandler(() => of({ ok: true }));

    interceptor.intercept(context, handler).subscribe({
      complete: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[abc-123] GET /health -> 200'),
        );
        done();
      },
    });
  });

  it('loguea el status real de un error cuando el handler falla', (done) => {
    const interceptor = new LoggingInterceptor();
    const context = buildContext({
      method: 'POST',
      originalUrl: '/participants',
      id: 'err-1',
    });
    const error = Object.assign(new Error('boom'), { status: 400 });
    const handler = buildHandler(() => throwError(() => error));

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        expect(logSpy).toHaveBeenCalledWith(
          expect.stringContaining('[err-1] POST /participants -> 400'),
        );
        done();
      },
    });
  });

  it('usa 500 como status si el error no trae uno explícito', (done) => {
    const interceptor = new LoggingInterceptor();
    const context = buildContext({
      method: 'GET',
      originalUrl: '/oops',
      id: 'err-2',
    });
    const handler = buildHandler(() =>
      throwError(() => new Error('sin status')),
    );

    interceptor.intercept(context, handler).subscribe({
      error: () => {
        expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('-> 500'));
        done();
      },
    });
  });
});
