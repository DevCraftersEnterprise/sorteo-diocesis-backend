import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './config/swagger.config';
import { setupGlobalPrefix } from './config/global-prefix.config';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd
      ? ['log', 'warn', 'error']
      : ['log', 'warn', 'error', 'debug', 'verbose'],
  });

  setupGlobalPrefix(app);
  if (!isProd) setupSwagger(app);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port');

  await app.listen(port!);
}
bootstrap().catch((error: unknown) => {
  Logger.error(
    'Fallo al iniciar la aplicación',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
