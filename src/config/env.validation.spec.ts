import { envValidationSchema } from './env.validation';

const validEnv = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgres://user:pass@localhost:5432/sorteo',
  CLOUDINARY_CLOUD_NAME: 'demo',
  CLOUDINARY_API_KEY: '123456',
  CLOUDINARY_API_SECRET: 'secret',
  ENCRYPTION_KEY: '0123456789abcdef',
  PHONE_SALT: 'somesalt',
  FIREBASE_PROJECT_ID: 'sorteo-app-523a4',
  FIREBASE_CLIENT_EMAIL: 'svc@sorteo-app-523a4.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY:
    '-----BEGIN PRIVATE KEY-----\\nFAKE\\n-----END PRIVATE KEY-----\\n',
};

describe('envValidationSchema', () => {
  it('pasa con todas las variables requeridas presentes y válidas', () => {
    const { error } = envValidationSchema.validate(validEnv, {
      abortEarly: false,
    });
    expect(error).toBeUndefined();
  });

  it('falla si falta DATABASE_URL', () => {
    const invalidEnv: Record<string, unknown> = { ...validEnv };
    delete invalidEnv.DATABASE_URL;
    const { error } = envValidationSchema.validate(invalidEnv, {
      abortEarly: false,
    });
    expect(error?.message).toContain('DATABASE_URL');
  });

  it('falla si ENCRYPTION_KEY tiene menos de 16 caracteres', () => {
    const { error } = envValidationSchema.validate(
      { ...validEnv, ENCRYPTION_KEY: 'corta' },
      { abortEarly: false },
    );
    expect(error?.message).toContain('ENCRYPTION_KEY');
  });

  it('falla si FIREBASE_CLIENT_EMAIL no es un email válido', () => {
    const { error } = envValidationSchema.validate(
      { ...validEnv, FIREBASE_CLIENT_EMAIL: 'no-es-un-email' },
      { abortEarly: false },
    );
    expect(error?.message).toContain('FIREBASE_CLIENT_EMAIL');
  });

  it('reporta varios errores a la vez (abortEarly: false)', () => {
    const { error } = envValidationSchema.validate(
      { NODE_ENV: 'development' },
      { abortEarly: false },
    );
    expect(error?.details.length).toBeGreaterThan(1);
  });

  it('acepta DATABASE_SSL en "false" (ej. CI contra Postgres local)', () => {
    const result = envValidationSchema.validate(
      { ...validEnv, DATABASE_SSL: 'false' },
      { abortEarly: false },
    );
    expect(result.error).toBeUndefined();

    const value = result.value as { DATABASE_SSL: string };
    expect(value.DATABASE_SSL).toBe('false');
  });

  it('rechaza un valor de DATABASE_SSL que no sea "true"/"false"', () => {
    const { error } = envValidationSchema.validate(
      { ...validEnv, DATABASE_SSL: 'maybe' },
      { abortEarly: false },
    );
    expect(error?.message).toContain('DATABASE_SSL');
  });
});
