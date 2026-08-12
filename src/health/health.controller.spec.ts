import { HealthCheckService } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { DatabaseHealthIndicator } from './database.health-indicator';

describe('HealthController', () => {
  it('delega en HealthCheckService con el indicador de base de datos', async () => {
    const checkResult = {
      status: 'ok' as const,
      info: {},
      error: {},
      details: {},
    };
    const checkMock = jest.fn().mockResolvedValue(checkResult);
    const dbCheckMock = jest
      .fn()
      .mockResolvedValue({ database: { status: 'up' } });

    const health = { check: checkMock } as unknown as HealthCheckService;
    const db = { check: dbCheckMock } as unknown as DatabaseHealthIndicator;

    const controller = new HealthController(health, db);
    const result = await controller.check();

    expect(result).toBe(checkResult);

    const calls = checkMock.mock.calls as unknown[][];
    const indicators = calls[0][0] as Array<() => unknown>;
    await indicators[0]();
    expect(dbCheckMock).toHaveBeenCalledWith('database');
  });
});
