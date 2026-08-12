import {
  Body,
  Controller,
  INestApplication,
  Module,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  ErrorResponseBody,
  HttpExceptionFilter,
} from '../src/common/filters/http-exception.filter';
import { validationPipeOptions } from '../src/config/validation-pipe.options';

interface ValidationHarnessSuccessBody {
  received: { name: string; count?: number };
  countType: string;
}

class ValidationHarnessDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  count?: number;
}

@Controller('validation-harness')
class ValidationHarnessController {
  @Post()
  create(@Body() dto: ValidationHarnessDto) {
    return { received: dto, countType: typeof dto.count };
  }
}

@Module({
  controllers: [ValidationHarnessController],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }],
})
class ValidationHarnessModule {}

describe('ValidationPipe (global, e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ValidationHarnessModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe(validationPipeOptions));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('acepta un payload válido y transforma los tipos declarados', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-harness')
      .send({ name: 'ok', count: '5' })
      .expect(201);

    const body = res.body as ValidationHarnessSuccessBody;
    expect(body.received).toEqual({ name: 'ok', count: 5 });
    expect(body.countType).toBe('number');
  });

  it('rechaza con 400 y la forma estándar de error si falta un campo requerido', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-harness')
      .send({})
      .expect(400);

    const body = res.body as ErrorResponseBody;
    expect(body).toMatchObject({ statusCode: 400, error: 'bad_request' });
    expect(Array.isArray(body.message)).toBe(true);
    expect((body.message as string[]).length).toBeGreaterThan(0);
  });

  it('rechaza con 400 si el tipo no coincide con lo declarado en el DTO', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-harness')
      .send({ name: 'ok', count: 'no-es-un-numero' })
      .expect(400);

    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('bad_request');
  });

  it('rechaza con 400 cualquier campo no declarado en el DTO (forbidNonWhitelisted)', async () => {
    const res = await request(app.getHttpServer())
      .post('/validation-harness')
      .send({ name: 'ok', hackerField: 'no debería existir' })
      .expect(400);

    const body = res.body as ErrorResponseBody;
    expect(body.error).toBe('bad_request');
  });
});
