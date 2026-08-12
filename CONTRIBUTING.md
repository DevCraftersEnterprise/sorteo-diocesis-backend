# Contribuir

Guía rápida de las convenciones de este repo. Aplica tanto si trabajas solo como si se suma más gente al equipo.

## Ramas

Convención: `<tipo>/backend/<NN>-<nombre-corto>`

- `migration/backend/…` — trabajo de migración desde el Express original (`sorteo_backend`), siguiendo el roadmap del plan de migración.
- `fix/backend/…` — corrección de un bug puntual, documentado como `BUG-XXX` en el plan.
- `test/backend/…` — solo agrega tests (ej. characterization tests), sin tocar comportamiento.
- `refactor/backend/…` — reordena/limpia código existente sin cambiar comportamiento externo.

Cada rama nace de `main`, nunca de otra rama de feature — evita cadenas de dependencias entre ramas de trabajo.

## Commits

Formato [Conventional Commits](https://www.conventionalcommits.org/): `tipo(alcance): descripción`.

Tipos usados en este repo: `feat`, `fix`, `refactor`, `test`, `chore`, `docs`.

## Antes de mergear a main

\`\`\`bash
npm run format:check
npm run lint:ci
npm run test
npm run test:e2e
npm run build
\`\`\`

Es exactamente lo que corre el CI (`.github/workflows/ci.yml`) — si pasa local, pasa en GitHub.

## Versionado

[SemVer](https://semver.org/lang/es/). Los tags/releases se crean solo en hitos grandes de la migración (no en cada tarea ni en cada Etapa) — por ejemplo, cuando este servicio reemplace por completo al backend Express. Las notas de cada release las genera GitHub automáticamente a partir de los commits/PRs incluidos.
