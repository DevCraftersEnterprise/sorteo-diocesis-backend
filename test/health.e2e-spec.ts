import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET) responde 200 con el estado real de la base de datos', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        const body = res.body as {
          status: string;
          details: { database: { status: string } };
        };
        if (body.status !== 'ok') {
          throw new Error(`status esperado "ok", recibido "${body.status}"`);
        }
        if (body.details.database.status !== 'up') {
          throw new Error('la base de datos debería reportarse "up"');
        }
      });
  });
});
