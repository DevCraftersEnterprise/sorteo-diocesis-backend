import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupGlobalPrefix } from './../src/config/global-prefix.config';
import { FirebaseAdminService } from './../src/integrations/firebase/firebase-admin.service';

describe('Participants (e2e)', () => {
  let app: INestApplication<App>;
  let verifyIdTokenMock: jest.Mock;

  beforeEach(async () => {
    verifyIdTokenMock = jest.fn();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseAdminService)
      .useValue({ verifyIdToken: verifyIdTokenMock })
      .compile();

    app = moduleFixture.createNestApplication();
    setupGlobalPrefix(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /api/participants', () => {
    it('crea un participante y responde 201', async () => {
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

  describe('GET /api/participants', () => {
    it('responde 401 sin token', async () => {
      await request(app.getHttpServer()).get('/api/participants').expect(401);
    });

    it('responde 403 con token válido pero sin el claim admin', async () => {
      verifyIdTokenMock.mockResolvedValue({ uid: 'user-1' });

      await request(app.getHttpServer())
        .get('/api/participants')
        .set('Authorization', 'Bearer fake-token')
        .expect(403);
    });

    it('responde 200 con la lista enmascarada cuando el token trae admin:true', async () => {
      verifyIdTokenMock.mockResolvedValue({ uid: 'admin-1', admin: true });

      await request(app.getHttpServer())
        .post('/api/participants')
        .send({
          name: 'Para Listado',
          walletNumber: '099',
          phone: '6449998877',
          photoPublicId: 'ine-photos/listado',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/participants')
        .set('Authorization', 'Bearer fake-admin-token')
        .expect(200);

      const body = res.body as Array<{
        walletNumber: string;
        phoneMasked: string;
      }>;
      expect(Array.isArray(body)).toBe(true);
      const created = body.find((p) => p.walletNumber === '099');
      expect(created).toBeDefined();
      expect(created?.phoneMasked).toMatch(/^\*\*\*_\*\*\*_\d{4}$/);
    });
  });
});
