import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

const SWAGGER_PATH = 'docs';

export function setupSwagger(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Sorteo Backend API')
    .setDescription(
      'API del sistema de sorteos — Diócesis de Ciudad Obregón. ' +
        'Migración incremental desde el backend Express original (sorteo_backend).',
    )
    .setVersion('0.1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description:
        'ID token de Firebase, requerido en los endpoints de administración.',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, document);

  return document;
}
