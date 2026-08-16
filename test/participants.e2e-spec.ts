import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupGlobalPrefix } from './../src/config/global-prefix.config';

describe('Participants (e2e)', () => {
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

  it('POST /api/participants crea un participante y responde 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/participants')
      .send({
        name: 'Juan Pérez (e2e)',
        walletNumber: '007',
        phone: '6441234567',
        photoPublicId: 'ine-photos/e2e-test',
      })
      .expect(201);

    const body = res.body as { id: string; createdAt: string };
    expect(body.id).toEqual(expect.any(String));
    expect(body.createdAt).toBeDefined();
  });

  it('responde 400 si faltan campos requeridos', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/participants')
      .send({ name: 'Solo nombre' })
      .expect(400);

    const body = res.body as { error: string };
    expect(body.error).toBe('bad_request');
  });

  it('responde 400 si walletNumber tiene formato inválido', async () => {
    await request(app.getHttpServer())
      .post('/api/participants')
      .send({
        name: 'Test',
        walletNumber: '7',
        phone: '6441234567',
        photoPublicId: 'ine-photos/x',
      })
      .expect(400);
  });

  it('responde 409 con wallet_already_taken si la cartera ya está registrada', async () => {
    const payload = {
      name: 'Duplicado',
      walletNumber: '008',
      phone: '6440000001',
      photoPublicId: 'ine-photos/dup',
    };

    await request(app.getHttpServer())
      .post('/api/participants')
      .send(payload)
      .expect(201);

    const res = await request(app.getHttpServer())
      .post('/api/participants')
      .send({ ...payload, phone: '6440000002' })
      .expect(409);

    const body = res.body as { error: string };
    expect(body.error).toBe('wallet_already_taken');
  });
});
