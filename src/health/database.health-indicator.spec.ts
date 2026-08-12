import { HealthIndicatorService } from '@nestjs/terminus';
import { Pool } from 'pg';
import { DatabaseHealthIndicator } from './database.health-indicator';

describe('DatabaseHealthIndicator', () => {
  it('reporta "up" cuando la base de datos responde', async () => {
    const queryMock = jest.fn().mockResolvedValue({ rows: [] });
    const pool = { query: queryMock } as unknown as Pool;
    const indicator = new DatabaseHealthIndicator(
      pool,
      new HealthIndicatorService(),
    );

    const result = await indicator.check('database');

    expect(queryMock).toHaveBeenCalledWith('SELECT 1');
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('reporta "down" con el mensaje del error cuando la base de datos falla', async () => {
    const queryMock = jest
      .fn()
      .mockRejectedValue(new Error('connection refused'));
    const pool = { query: queryMock } as unknown as Pool;
    const indicator = new DatabaseHealthIndicator(
      pool,
      new HealthIndicatorService(),
    );

    const result = await indicator.check('database');

    expect(result).toEqual({
      database: { status: 'down', message: 'connection refused' },
    });
  });
});
