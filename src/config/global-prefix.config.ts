import { INestApplication } from '@nestjs/common';

const EXCLUDED_FROM_API_PREFIX = ['health', 'docs', 'docs-json'];

export function setupGlobalPrefix(app: INestApplication): void {
  app.setGlobalPrefix('api', { exclude: EXCLUDED_FROM_API_PREFIX });
}
