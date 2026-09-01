import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setupCors } from './cors.config';

function buildApp(origins: string[] | undefined) {
  const enableCorsMock = jest.fn();
  const getMock = jest.fn().mockReturnValue(origins);
  const configService = { get: getMock } as unknown as ConfigService;
  const app = {
    enableCors: enableCorsMock,
    get: jest.fn().mockReturnValue(configService),
  } as unknown as INestApplication;

  return { app, enableCorsMock };
}

describe('setupCors', () => {
  it('habilita CORS con los orígenes de cors.origins', () => {
    const { app, enableCorsMock } = buildApp([
      'http://localhost:5173',
      'https://sitio.netlify.app',
    ]);

    setupCors(app);

    expect(enableCorsMock).toHaveBeenCalledWith({
      origin: ['http://localhost:5173', 'https://sitio.netlify.app'],
    });
  });

  it('usa un array vacío si cors.origins no está definido', () => {
    const { app, enableCorsMock } = buildApp(undefined);

    setupCors(app);

    expect(enableCorsMock).toHaveBeenCalledWith({ origin: [] });
  });
});
