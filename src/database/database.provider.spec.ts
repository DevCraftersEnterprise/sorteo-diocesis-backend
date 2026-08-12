import { FactoryProvider } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { databaseProviders } from './database.providers';

jest.mock('pg', () => ({
  Pool: jest
    .fn()
    .mockImplementation(() => ({ query: jest.fn(), end: jest.fn() })),
}));

function buildConfigService(values: Record<string, unknown>): ConfigService {
  const getMock = jest.fn((key: string) => values[key]);
  return { get: getMock } as unknown as ConfigService;
}

describe('databaseProviders', () => {
  it('crea el Pool con ssl habilitado cuando database.ssl es true (ej. Render)', () => {
    const configService = buildConfigService({
      'database.url': 'postgres://user:pass@host:5432/db',
      'database.ssl': true,
    });

    const provider = databaseProviders[0] as FactoryProvider<Pool>;
    void provider.useFactory(configService);

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@host:5432/db',
      ssl: { rejectUnauthorized: false },
    });
  });

  it('crea el Pool sin ssl cuando database.ssl es false (ej. Postgres local de CI)', () => {
    const configService = buildConfigService({
      'database.url': 'postgres://user:pass@host:5432/db',
      'database.ssl': false,
    });

    const provider = databaseProviders[0] as FactoryProvider<Pool>;
    void provider.useFactory(configService);

    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@host:5432/db',
      ssl: false,
    });
  });
});
