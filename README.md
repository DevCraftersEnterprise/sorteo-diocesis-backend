# Sorteo Backend (NestJS)

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

## Despliegue

Servicio independiente en Render, desplegado en paralelo al backend Express original durante la migración. Variables de entorno configuradas en el panel de Render (se documentan a partir de la Tarea 1.2).

## Licencia

MIT
