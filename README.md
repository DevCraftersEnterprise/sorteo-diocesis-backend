# Sorteo Backend (NestJS)

[![CI](https://github.com/DevCraftersEnterprise/sorteo-diocesis-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/DevCraftersEnterprise/sorteo-diocesis-backend/actions/workflows/ci.yml)

> Sustituto incremental de `sorteo_backend` (Express). Ver el plan de migración completo para el orden de corte de endpoints.

## Estado

🚧 En migración. Este servicio convive con el backend Express original — cada endpoint se corta cuando su módulo equivalente aquí está probado y desplegado. Ver `migration/backend/*` en el historial de ramas.

## Requisitos

- Node.js >= 20
- PostgreSQL (misma base que el backend Express durante la coexistencia)

## Instalación

\`\`\`bash
npm install
\`\`\`

## Desarrollo

\`\`\`bash
npm run start:dev
\`\`\`

## Tests

\`\`\`bash
npm run test # unit
npm run test:e2e # e2e
npm run test:cov # cobertura
\`\`\`

Servicio independiente en Render, desplegado en paralelo al backend Express original durante la migración. Variables de entorno: ver `.env.template` para la lista completa; se configuran manualmente en el panel de Render (Build Command: `npm install && npm run build`, Start Command: `npm run start:prod`, Health Check Path: `/health`).

## Documentación de la API

Swagger UI disponible en `/docs` (y el spec OpenAPI en `/docs-json`) mientras el servicio está corriendo.

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para convención de ramas, commits y versionado.

## Licencia

MIT
