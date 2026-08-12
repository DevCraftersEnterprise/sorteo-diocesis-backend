import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupSwagger } from './../src/config/swagger.config';

describe('Swagger (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupSwagger(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/docs-json (GET) expone el documento OpenAPI con /health documentado', async () => {
    const res = await request(app.getHttpServer())
      .get('/docs-json')
      .expect(200);

    const body = res.body as {
      info: { title: string };
      paths: Record<string, unknown>;
    };
    expect(body.info.title).toBe('Sorteo Backend API');
    expect(body.paths).toHaveProperty('/health');
  });

  it('/docs (GET) sirve la interfaz de Swagger UI', async () => {
    const res = await request(app.getHttpServer()).get('/docs').expect(200);
    expect(res.text).toContain('swagger-ui');
  });
});
