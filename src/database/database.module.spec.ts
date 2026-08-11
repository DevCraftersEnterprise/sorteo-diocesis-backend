import { Test } from '@nestjs/testing';
import { DatabaseModule } from './database.module';
import { PG_POOL } from './database.constants';

describe('DatabaseModule', () => {
    it('verifica la conexión (SELECT 1) al inicializar la app', async () => {
        const fakePool = {
            query: jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] }),
            end: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] })
            .overrideProvider(PG_POOL)
            .useValue(fakePool)
            .compile();

        const app = moduleRef.createNestApplication();
        await app.init();

        expect(fakePool.query).toHaveBeenCalledWith('SELECT 1');

        await app.close();
        expect(fakePool.end).toHaveBeenCalled();
    });

    it('falla el arranque si la base de datos no responde', async () => {
        const fakePool = {
            query: jest.fn().mockRejectedValue(new Error('connection refused')),
            end: jest.fn(),
        };

        const moduleRef = await Test.createTestingModule({ imports: [DatabaseModule] })
            .overrideProvider(PG_POOL)
            .useValue(fakePool)
            .compile();

        const app = moduleRef.createNestApplication();

        await expect(app.init()).rejects.toThrow('connection refused');
    });
});
