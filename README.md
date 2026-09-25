# Sorteo Diócesis — Backend (NestJS) ⛪

[![CI](https://github.com/DevCraftersEnterprise/sorteo-diocesis-backend/actions/workflows/ci.yml/badge.svg)](https://github.com/DevCraftersEnterprise/sorteo-diocesis-backend/actions/workflows/ci.yml)

API del sistema de sorteos de la **Diócesis de Ciudad Obregón**. Recibe el registro público de participantes (nombre, número de cartera, teléfono y foto de INE), y ofrece al equipo administrador la lista de carteras sin pagar, el marcado de pago, la exportación a Excel + fotos y la purga de fin de sorteo.

Sustituye de forma incremental a `sorteo_backend` (Express): ambos servicios conviven sobre **la misma base de datos** y cada endpoint se corta al nuevo backend cuando su módulo equivalente aquí está probado y desplegado. El cliente es [`sorteo-diocesis-frontend`](https://github.com/DevCraftersEnterprise/sorteo-diocesis-frontend) (Vue 3), que a su vez reemplaza a la app Flutter `sorteos_app`.

## 📑 Tabla de Contenidos

- [Stack Tecnológico](#️-stack-tecnológico)
- [Arquitectura](#-arquitectura)
- [Instalación](#-instalación)
- [Variables de Entorno](#-variables-de-entorno)
- [Comandos](#-comandos)
- [Endpoints](#-endpoints)
- [Reglas de Negocio](#-reglas-de-negocio)
- [Base de Datos y Migraciones](#️-base-de-datos-y-migraciones)
- [Administradores (Firebase)](#-administradores-firebase)
- [Pruebas](#-pruebas)
- [Despliegue](#-despliegue)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Estado de la Migración](#-estado-de-la-migración)

## 🛠️ Stack Tecnológico

- **NestJS 11** + **TypeScript 5** — Node.js ≥ 20 (CI usa Node 22)
- **PostgreSQL** con el driver `pg` directo (SQL a mano, **sin ORM**) y la extensión `pgcrypto` para cifrar teléfonos
- **node-pg-migrate** — migraciones en SQL puro
- **Firebase Admin** — verificación de ID tokens y custom claim `admin`
- **Cloudinary** — almacenamiento privado (`authenticated`) de las fotos de INE
- **ExcelJS** + **archiver** — exportación `.xlsx` + fotos en un ZIP por streaming
- **Joi** (validación de variables de entorno), **class-validator** (DTOs), **@nestjs/terminus** (health check), **@nestjs/swagger** (OpenAPI)
- **Jest** + **Supertest** — pruebas unitarias y e2e contra un Postgres real

## 🧭 Arquitectura

```
                     ┌────────────────────────┐
  Navegador ────────▶│ Frontend Vue (Netlify) │
     │               └───────────┬────────────┘
     │ foto (subida directa,     │ JSON  /api/*
     │ con firma del backend)    ▼
     │               ┌────────────────────────┐      ┌──────────────────┐
     │               │  Backend NestJS        │─────▶│ PostgreSQL       │
     │               │  (Render)              │      │ (compartida con  │
     │               └──┬──────────────────┬──┘      │  Express)        │
     ▼                  │ firma / borrado  │ verifica└──────────────────┘
┌──────────────┐        ▼                  ▼ ID token
│  Cloudinary  │◀───────┘           ┌──────────────┐
└──────────────┘                    │ Firebase Auth│
                                    └──────────────┘
```

- **La foto nunca pasa por este servidor**: el backend solo firma la subida (`POST /api/sign-upload`) y el navegador la envía directo a Cloudinary; al registrar al participante se guarda su `photo_public_id`.
- Cada módulo sigue `controller` (rutas delgadas) → `service` (reglas y traducción de errores) → `repository` (SQL con `pg`). El único repositorio hoy es `ParticipantsRepository`, compartido por los módulos `participants`, `wallet` y `admin`.
- Transversal a toda la app (registrado en `AppModule`):
  - Prefijo global `/api`, excepto `/health`, `/docs` y `/docs-json`.
  - `ValidationPipe` global con `whitelist` + `forbidNonWhitelisted`: un campo que no esté en el DTO devuelve `400`.
  - `RequestIdMiddleware`: cada respuesta lleva el header `X-Request-Id` (UUID), que también aparece en los logs y en el cuerpo de los errores.
  - `LoggingInterceptor`: una línea por request (`[requestId] METHOD url -> status (ms)`).
  - `HttpExceptionFilter`: **todas** las respuestas de error tienen la misma forma:

    ```json
    {
      "statusCode": 409,
      "error": "wallet_already_taken",
      "message": "La cartera 007 ya está registrada",
      "path": "/api/participants",
      "timestamp": "2026-09-24T18:00:00.000Z",
      "requestId": "3f0c…"
    }
    ```

    `error` es un código en `snake_case` pensado para que el cliente decida qué hacer; `message` es texto en español para mostrar al usuario. Los errores no controlados responden `500 internal_server_error` sin filtrar detalles, y se registran con stack.

## 📦 Instalación

```bash
npm install
cp .env.template .env   # y completa los valores (ver abajo)
```

Requisitos: Node.js ≥ 20, un PostgreSQL accesible y credenciales de Cloudinary y de una cuenta de servicio de Firebase. Para las pruebas e2e también hace falta Docker (ver [Pruebas](#-pruebas)).

## 🔧 Variables de Entorno

Se validan con Joi al arrancar (`src/config/env.validation.ts`): si falta una obligatoria, la app **no inicia** y el error lista todas las que faltan.

| Variable | Obligatoria | Descripción |
|----------|:-----------:|-------------|
| `NODE_ENV` | — | `development` (default), `production` o `test`. En `production` se desactiva Swagger, se reducen los logs y las fotos van a la carpeta `prod` de Cloudinary. |
| `PORT` | — | Puerto HTTP. Default `3000`. |
| `DATABASE_URL` | ✅ | Cadena de conexión de Postgres. Durante la coexistencia, **la misma base que el backend Express**. |
| `DATABASE_SSL` | — | `true` (default) o `false`. Con `true` se conecta por SSL sin verificar el certificado (lo que piden los Postgres administrados); en local/Docker usa `false`. |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | ✅ | Credenciales de Cloudinary. |
| `CORS_ORIGINS` | — | Orígenes permitidos, separados por coma. Default `http://localhost:5173` (Vite en local). **En producción debe incluir el dominio de Netlify** o el navegador bloqueará todas las llamadas del frontend. |
| `ENCRYPTION_KEY` | ✅ | Clave simétrica (mín. 16 caracteres) con la que `pgcrypto` cifra el teléfono. Debe ser **la misma que usa el backend Express**: con otra clave no se pueden descifrar los teléfonos ya guardados. |
| `PHONE_SALT` | ✅ | Salt del hash SHA-256 del teléfono (`phone_hash`). También debe coincidir con el de Express. |
| `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY` | ✅ | Cuenta de servicio de Firebase Admin. La llave privada puede ir en una sola línea con `\n` literales; se convierten a saltos de línea al cargarla. |
| `TZ` | — | Zona horaria de las fechas del Excel exportado. Default `America/Hermosillo`. |

> ⚠️ `ENCRYPTION_KEY` y `PHONE_SALT` protegen datos personales y no se pueden cambiar sin re-cifrar/re-hashear los registros existentes. Nunca las subas al repositorio ni las compartas entre ambientes de prueba y producción.

`.env.test` contiene los valores para las pruebas e2e locales (Postgres de Docker en el puerto `5433`, credenciales falsas).

## ⚡ Comandos

### Desarrollo

```bash
npm run start:dev     # modo watch en http://localhost:3000
npm run start:debug   # watch + inspector de Node
npm run build         # compila a dist/
npm run start:prod    # corre dist/main (lo que usa Render)
```

Con `NODE_ENV` distinto de `production`, Swagger UI queda en `http://localhost:3000/docs` y el spec OpenAPI en `/docs-json`. Para probar endpoints de admin desde Swagger, usa el botón **Authorize** con un ID token de Firebase de una cuenta con el claim `admin`.

### Calidad de código

```bash
npm run format        # Prettier (escribe)
npm run format:check  # Prettier (solo verifica, como en CI)
npm run lint          # ESLint con autofix
npm run lint:ci       # ESLint sin autofix, como en CI
```

Husky corre `lint-staged` (Prettier + ESLint sobre los `.ts` en stage) en cada commit.

### Base de datos

```bash
npm run migrate:create -- <nombre>   # nueva migración SQL en migrations/
npm run migrate:up                   # aplica pendientes contra DATABASE_URL (.env)
npm run migrate:up:test              # aplica pendientes contra la base de .env.test
```

### Administradores

```bash
npm run admin:set-claim -- <email>   # da admin:true a un usuario de Firebase
npm run admin:set-claim-all          # da admin:true a TODOS los usuarios del proyecto
```

Ver [Administradores (Firebase)](#-administradores-firebase).

## 🔌 Endpoints

Todas las rutas llevan el prefijo `/api`, salvo `/health`. 🔒 = requiere `Authorization: Bearer <ID token de Firebase>` de una cuenta con el custom claim `admin: true`.

| Método | Ruta | Auth | Descripción |
|--------|------|:----:|-------------|
| `GET` | `/health` | — | Estado del servicio y de la conexión a Postgres (health check de Render). |
| `POST` | `/api/sign-upload` | — | Firma para subir la foto directo a Cloudinary (`cloudName`, `apiKey`, `timestamp`, `signature`, `folder`, `type`). |
| `GET` | `/api/wallet/validate?wallet=007` | — | `200 { ok, wallet }` si la cartera está libre; `409 wallet_already_taken` si ya existe. |
| `POST` | `/api/participants` | — | Registra a un participante. Body: `name`, `walletNumber`, `phone`, `photoPublicId`, `photoVersion?`. Responde `{ id, createdAt }`. |
| `GET` | `/api/participants` | 🔒 | Lista de participantes con el teléfono enmascarado (`***_***_1234`). |
| `GET` | `/api/admin/unpaid?q=` | 🔒 | Carteras sin pagar (máx. 500), filtradas por nombre o prefijo de cartera, ordenadas por número. **Respuesta en `snake_case`**. |
| `PUT` | `/api/admin/mark-paid` | 🔒 | Marca una cartera como pagada. Body: `{ walletNumber }`. |
| `GET` | `/api/admin/export` | 🔒 | Descarga `sorteo_export.zip` con `sorteo.xlsx` y la carpeta `fotos/`. |
| `POST` | `/api/admin/purge` | 🔒 | Borra **todos** los participantes y sus fotos. Exige el header `X-Confirm-Purge: yes`. |

Sin token el guard responde `401 unauthorized`; con un token válido pero sin el claim, `403 forbidden`.

## 📋 Reglas de Negocio

### Cartera (`walletNumber`)

- Es un **string de 3 dígitos entre `"001"` y `"840"`** (`IsWalletNumber` en `src/common/validators/`). `"7"` o `"999"` se rechazan con `400`; el frontend rellena con ceros antes de enviar.
- Es **única**. `GET /wallet/validate` es solo una comprobación previa: entre esa consulta y el registro otro participante puede tomar la misma cartera (condición de carrera conocida y documentada). La garantía real es el índice único `idx_participants_wallet_number`: si choca, `POST /participants` responde `409 wallet_already_taken`.
- El `CHECK` `chk_wallet_number_format` de la tabla repite la regla de formato como red de seguridad a nivel de base de datos.

### Teléfono (datos personales)

Al registrar se guardan tres columnas, nunca el teléfono en claro:

| Columna | Contenido | Uso |
|---------|-----------|-----|
| `phone_enc` | `pgp_sym_encrypt(phone, ENCRYPTION_KEY)` (AES-256, `pgcrypto`) | Solo se descifra en la exportación a Excel. |
| `phone_last4` | Últimos 4 dígitos | Vista `participants_masked` (`***_***_1234`). |
| `phone_hash` | `SHA-256(phone + PHONE_SALT)` | Búsqueda/igualdad sin descifrar. |

### Pagos

- `PUT /admin/mark-paid` pone `is_paid = true`, `paid_at = now()` y `marked_by_email` con **el email del token verificado**, nunca con el del body. El campo `adminEmail` del body se acepta únicamente por compatibilidad con el cliente Flutter y se ignora (corrige BUG-002).
- Si la cartera no existe responde `404 participant_not_found`.

### Exportación

- El Excel incluye nombre, cartera, **teléfono completo descifrado**, fecha de registro, pagado, fecha de pago y quién lo marcó. Las fechas se formatean en `TZ` (default `America/Hermosillo`).
- Las fotos se descargan de Cloudinary con URLs firmadas de 180 s, **10 a la vez**, y se guardan como `fotos/<cartera>-<nombre>.jpg` (máx. 1080 px, JPG).
- La respuesta es un stream: si falla antes de enviar headers se responde `500 export_failed`; si ya empezó, se corta la conexión sin tirar el proceso (corrige BUG-004).

### Purga

- Pensada para el cierre de un sorteo: **exporta antes**, porque no hay forma de recuperar los datos.
- Borra las filas en una sola sentencia `DELETE … RETURNING photo_public_id` (sin ventana de carrera) y después borra las fotos en Cloudinary en lotes de 100.
- Cloudinary no puede formar parte de la transacción: si alguna foto no se borra, la respuesta lo indica en `failedPhotoDeletions` y los `public_id` huérfanos quedan en el log como `warn`.

```json
{ "ok": true, "deletedParticipants": 312, "deletedPhotos": 311, "failedPhotoDeletions": 1 }
```

### Fotos en Cloudinary

- Se suben como `type: authenticated` (no son públicas; solo se ven con URL firmada).
- Carpeta `diocesis-sorteo/prod` cuando `NODE_ENV=production` y `diocesis-sorteo/dev` en cualquier otro caso (incluido `test`), para que las pruebas manuales no se mezclen con fotos reales.

## 🗄️ Base de Datos y Migraciones

Las migraciones son **SQL puro** en `migrations/`, gestionadas con `node-pg-migrate` (tabla de control `pgmigrations`). El esquema actual es una sola migración, `initial-schema`:

- Extensión `pgcrypto`.
- Tabla `participants` (`id` UUID, `name`, `wallet_number`, `photo_public_id`, `photo_version`, `phone_enc`, `phone_last4`, `phone_hash`, `created_at`, `is_paid`, `paid_at`, `marked_by_email`) con el `CHECK` de formato de cartera.
- Índice único `idx_participants_wallet_number`.
- Vista `participants_masked` (teléfono enmascarado, ordenada por fecha de registro descendente).

La migración inicial usa `IF NOT EXISTS`/`OR REPLACE` porque la base ya existía (la creó el backend Express): aplicarla sobre la base de coexistencia no altera los datos.

Para un cambio de esquema:

1. `npm run migrate:create -- <nombre-descriptivo>` y escribe el SQL de subida.
2. Pruébala en local con `npm run migrate:up:test` y `npm run test:e2e`.
3. **Mientras dure la coexistencia**, cualquier cambio debe seguir siendo compatible con el backend Express, que lee y escribe las mismas tablas.
4. Aplica la migración en producción manualmente con `npm run migrate:up` apuntando a esa base (el deploy de Render **no** corre migraciones).

## 🔐 Administradores (Firebase)

Los administradores son usuarios de **Firebase Authentication** (email y contraseña) del mismo proyecto que usa el frontend. Un token válido no basta: la cuenta debe tener el custom claim `admin: true`.

1. Crea el usuario en Firebase Console → Authentication.
2. Con las credenciales de Firebase en tu `.env`, corre:

   ```bash
   npm run admin:set-claim -- persona@ejemplo.com
   ```

3. El usuario debe **cerrar sesión y volver a entrar** para que el claim aparezca en su ID token.

`npm run admin:set-claim-all` otorga el claim a **todos** los usuarios del proyecto de Firebase; úsalo solo si todas las cuentas existentes deben ser administradoras.

## 🧪 Pruebas

```bash
npm run test          # unitarias (*.spec.ts junto al código)
npm run test:watch
npm run test:cov      # cobertura en coverage/
npm run test:e2e      # e2e (test/*.e2e-spec.ts) contra Postgres real
```

Las pruebas e2e **escriben datos**, así que corren contra un Postgres local en Docker, nunca contra la base de coexistencia. Preparación (una sola vez):

```bash
docker compose -f docker-compose.test.yml up -d   # Postgres 16 en localhost:5433
npm run migrate:up:test
```

`npm run test:e2e` carga `.env.test` automáticamente y, antes de correr, vacía la tabla `participants` (`scripts/reset-test-db.cjs`).

### CI

`.github/workflows/ci.yml` corre en cada push y PR a `main`, con un Postgres 16 efímero:

`format:check` → `lint:ci` → `test` → `migrate:up:ci` → `test:e2e` → `build`

Son los mismos comandos que debes correr en local antes de abrir un PR (ver [CONTRIBUTING.md](./CONTRIBUTING.md)).

## 🚀 Despliegue

Servicio web independiente en **Render**, desplegado en paralelo al backend Express durante la migración:

| Ajuste | Valor |
|--------|-------|
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start:prod` |
| Health Check Path | `/health` |
| Variables | Las de [Variables de Entorno](#-variables-de-entorno), configuradas a mano en el panel de Render, con `NODE_ENV=production` y `CORS_ORIGINS` apuntando al dominio de Netlify del frontend |

- No hay `render.yaml` en el repo: la configuración vive en el panel de Render.
- Las migraciones **no** se aplican en el deploy; córrelas manualmente antes de desplegar código que dependa de ellas.
- En producción Swagger no se expone.

## 📁 Estructura del Proyecto

```
├── migrations/                 # Migraciones SQL (node-pg-migrate)
├── scripts/                    # Scripts sueltos (.cjs): claims de admin, reset de la base de test
├── test/                       # Pruebas e2e (*.e2e-spec.ts) + jest-e2e.json
├── docker-compose.test.yml     # Postgres local para e2e (puerto 5433)
└── src/
    ├── main.ts                 # Bootstrap: prefijo /api, CORS, Swagger (fuera de prod)
    ├── app.module.ts           # Config global, pipe/filtro/interceptor/middleware globales
    ├── config/                 # configuration.ts, validación Joi del .env, CORS, Swagger, ValidationPipe
    ├── common/
    │   ├── crypto/             # CryptoService: hash y últimos 4 dígitos del teléfono, clave de cifrado
    │   ├── decorators/         # @CurrentUser() — datos del token Firebase verificado
    │   ├── filters/            # HttpExceptionFilter — forma única de los errores
    │   ├── guards/             # FirebaseAuthGuard — token válido + claim admin
    │   ├── interceptors/       # LoggingInterceptor
    │   ├── middleware/         # RequestIdMiddleware (X-Request-Id)
    │   └── validators/         # @IsWalletNumber()
    ├── database/               # Pool de pg (token PG_POOL)
    ├── health/                 # GET /health con indicador de Postgres
    ├── integrations/
    │   ├── cloudinary/         # Firma de subida, URLs firmadas, borrado en lotes
    │   └── firebase/           # Firebase Admin (verifyIdToken)
    └── modules/
        ├── admin/              # unpaid, mark-paid, export, purge
        ├── export/             # ExportService: Excel + fotos en ZIP por streaming
        ├── participants/       # Alta pública, listado enmascarado, ParticipantsRepository (SQL)
        ├── upload/             # POST /sign-upload
        └── wallet/             # GET /wallet/validate
```

Cada archivo con lógica tiene su `.spec.ts` al lado.

## 🚧 Estado de la Migración

Endpoints ya migrados a este servicio: registro, validación de cartera, firma de subida, listado de participantes, carteras sin pagar, marcar como pagado, exportación y purga (ver [Endpoints](#-endpoints)). Durante la migración se corrigieron, entre otros:

| Referencia | Corrección |
|------------|------------|
| BUG-001 | La purga usa `POST` (lo que siempre envió el cliente) y exige `X-Confirm-Purge: yes`. |
| BUG-002 | `marked_by_email` sale del token verificado, no del body. |
| BUG-003 / A2 | Formato y rango de cartera validados en el DTO y en la base. |
| BUG-004 / C3 | Un error al generar el ZIP ya no tira el proceso completo. |
| C2 | Los endpoints de admin exigen el claim `admin`, no solo un token válido. |
| M6 | Las fotos del export se descargan con concurrencia acotada para que las URLs firmadas no expiren. |
| A3 | La purga reporta qué fotos quedaron huérfanas en Cloudinary. |

Los códigos (`BUG-XXX`, `C2`, etc.) remiten al plan de migración. El backend Express se retirará cuando todos los clientes apunten a este servicio; los releases se etiquetan solo en hitos así (ver [Versionado](./CONTRIBUTING.md#versionado)).

## 🤝 Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md): convención de ramas, commits, checklist antes de mergear y versionado.

## 📄 Licencia

[MIT](./LICENCE) © Sergio Barreras González

---

📍 **Proyecto**: Sorteo Diócesis de Ciudad Obregón — Backend
🏢 **Desarrollado por**: DevCrafters
📅 **Última actualización**: Septiembre 2026
