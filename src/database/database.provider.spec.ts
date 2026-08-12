import { FactoryProvider } from '@nestjs/common';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';
import { databaseProviders } from './database.providers';

jest.mock('pg', () => ({
  Pool: jest
    .fn()
    .mockImplementation(() => ({ query: jest.fn(), end: jest.fn() })),
}));

describe('databaseProviders', () => {
  it('crea el Pool con la connection string de ConfigService y ssl.rejectUnauthorized:false', () => {
    const getMock = jest
      .fn()
      .mockReturnValue('postgres://user:pass@host:5432/db');
    const configService = { get: getMock } as unknown as ConfigService;

    const provider = databaseProviders[0] as FactoryProvider<Pool>;
    void provider.useFactory(configService);

    expect(getMock).toHaveBeenCalledWith('database.url');
    expect(Pool).toHaveBeenCalledWith({
      connectionString: 'postgres://user:pass@host:5432/db',
      ssl: { rejectUnauthorized: false },
    });
  });
});
