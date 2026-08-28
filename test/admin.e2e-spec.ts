import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Pool } from 'pg';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupGlobalPrefix } from './../src/config/global-prefix.config';
import { PG_POOL } from './../src/database/database.constants';
import { FirebaseAdminService } from './../src/integrations/firebase/firebase-admin.service';

describe('Admin (e2e)', () => {
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

  describe('PUT /api/admin/mark-paid', () => {
    it('responde 401 sin token', async () => {
      await request(app.getHttpServer())
        .put('/api/admin/mark-paid')
        .send({ walletNumber: '007' })
        .expect(401);
    });

    it('responde 403 con token válido pero sin claim admin', async () => {
      verifyIdTokenMock.mockResolvedValue({ uid: 'user-1' });

      await request(app.getHttpServer())
        .put('/api/admin/mark-paid')
        .set('Authorization', 'Bearer token')
        .send({ walletNumber: '007' })
        .expect(403);
    });

    it('responde 404 si la cartera no existe', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'admin-1',
        admin: true,
        email: 'admin@example.com',
      });

      const res = await request(app.getHttpServer())
        .put('/api/admin/mark-paid')
        .set('Authorization', 'Bearer token')
        .send({ walletNumber: '840' })
        .expect(404);

      const body = res.body as { error: string };
      expect(body.error).toBe('participant_not_found');
    });

    it('marca como pagado y guarda el email real del token, ignorando adminEmail del body (BUG-002)', async () => {
      verifyIdTokenMock.mockResolvedValue({
        uid: 'admin-1',
        admin: true,
        email: 'admin-real@example.com',
      });

      await request(app.getHttpServer())
        .post('/api/participants')
        .send({
          name: 'Para Pagar',
          walletNumber: '050',
          phone: '6441112222',
          photoPublicId: 'ine-photos/pagar',
        })
        .expect(201);

      await request(app.getHttpServer())
        .put('/api/admin/mark-paid')
        .set('Authorization', 'Bearer token')
        .send({ walletNumber: '050', adminEmail: 'suplantado@evil.com' })
        .expect(200);

      const pool = app.get<Pool>(PG_POOL);
      const { rows } = await pool.query<{
        is_paid: boolean;
        marked_by_email: string;
      }>(
        'SELECT is_paid, marked_by_email FROM participants WHERE wallet_number = $1',
        ['050'],
      );

      expect(rows[0].is_paid).toBe(true);
      expect(rows[0].marked_by_email).toBe('admin-real@example.com');
    });
  });
});
