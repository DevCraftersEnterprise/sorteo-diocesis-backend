import configuration from './configuration';

describe('configuration()', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('mapea las variables planas a la estructura anidada esperada', () => {
    process.env.PORT = '4000';
    process.env.DATABASE_URL = 'postgres://x';
    process.env.DATABASE_SSL = 'true';
    process.env.CLOUDINARY_CLOUD_NAME = 'cloud';
    process.env.CLOUDINARY_API_KEY = 'key';
    process.env.CLOUDINARY_API_SECRET = 'secret';
    process.env.ENCRYPTION_KEY = '0123456789abcdef';
    process.env.PHONE_SALT = 'salt';
    process.env.FIREBASE_PROJECT_ID = 'proj';
    process.env.FIREBASE_CLIENT_EMAIL = 'a@b.com';
    process.env.FIREBASE_PRIVATE_KEY = 'line1\\nline2';

    const config = configuration();

    expect(config.port).toBe(4000);
    expect(config.database.url).toBe('postgres://x');
    expect(config.database.ssl).toBe(true);
    expect(config.cloudinary).toEqual({
      cloudName: 'cloud',
      apiKey: 'key',
      apiSecret: 'secret',
    });
    expect(config.security).toEqual({
      encryptionKey: '0123456789abcdef',
      phoneSalt: 'salt',
    });
    // \n escapado se convierte en salto de línea real
    expect(config.firebase.privateKey).toBe('line1\nline2');
  });

  it('usa 3000 como puerto por defecto si PORT no está definido', () => {
    delete process.env.PORT;
    expect(configuration().port).toBe(3000);
  });

  it('desactiva ssl solo si DATABASE_SSL es exactamente "false"', () => {
    process.env.DATABASE_SSL = 'false';
    expect(configuration().database.ssl).toBe(false);
  });

  it('usa http://localhost:5173 como cors.origins por defecto', () => {
    delete process.env.CORS_ORIGINS;
    expect(configuration().cors.origins).toEqual(['http://localhost:5173']);
  });

  it('parsea CORS_ORIGINS separado por comas, recortando espacios', () => {
    process.env.CORS_ORIGINS =
      'http://localhost:5173, https://sitio.netlify.app ,https://otro.com';
    expect(configuration().cors.origins).toEqual([
      'http://localhost:5173',
      'https://sitio.netlify.app',
      'https://otro.com',
    ]);
  });

  it('descarta entradas vacías en CORS_ORIGINS (ej. coma final)', () => {
    process.env.CORS_ORIGINS = 'http://localhost:5173,';
    expect(configuration().cors.origins).toEqual(['http://localhost:5173']);
  });
});
