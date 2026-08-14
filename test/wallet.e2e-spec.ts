import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupGlobalPrefix } from './../src/config/global-prefix.config';

describe('Wallet (e2e)', () => {
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

  it('responde ok:true para una cartera que seguro no existe', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wallet/validate')
      .query({ wallet: 'e2e-wallet-inexistente' })
      .expect(200);

    expect(res.body).toEqual({ ok: true, wallet: 'e2e-wallet-inexistente' });
  });

  it('responde 400 con el código de negocio si no se manda wallet', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/wallet/validate')
      .expect(400);

    const body = res.body as { error: string };
    expect(body.error).toBe('invalid_wallet_number');
  });
});
