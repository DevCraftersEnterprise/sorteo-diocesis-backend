import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupGlobalPrefix } from './../src/config/global-prefix.config';

describe('Upload (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupGlobalPrefix(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /api/sign-upload responde 200 (status exacto que valida el cliente Flutter)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/sign-upload')
      .expect(200);

    const body = res.body as {
      folder: string;
      type: string;
      signature: string;
    };
    // NODE_ENV=test en .env.test cae en la rama "dev" a propósito.
    expect(body.folder).toBe('diocesis-sorteo/dev');
    expect(body.type).toBe('authenticated');
    expect(typeof body.signature).toBe('string');
  });

  it('ignora cualquier body enviado, igual que el Express original', async () => {
    await request(app.getHttpServer())
      .post('/api/sign-upload')
      .send({ walletNumber: '007', campoQueNoExiste: 'x' })
      .expect(200);
  });

  it('/health sigue fuera del prefijo /api', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
  });
});
