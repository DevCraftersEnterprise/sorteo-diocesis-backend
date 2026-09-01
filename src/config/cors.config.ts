import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function setupCors(app: INestApplication): void {
  const configService = app.get(ConfigService);
  const origins = configService.get<string[]>('cors.origins') ?? [];

  app.enableCors({ origin: origins });
}
