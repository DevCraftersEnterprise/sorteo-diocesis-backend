import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { PG_POOL } from './database.constants';

export const databaseProviders: Provider[] = [
  {
    provide: PG_POOL,
    inject: [ConfigService],
    useFactory: (configService: ConfigService) =>
      new Pool({
        connectionString: configService.get<string>('database.url'),
        ssl: {
          rejectUnauthorized: false,
        },
      }),
  },
];
