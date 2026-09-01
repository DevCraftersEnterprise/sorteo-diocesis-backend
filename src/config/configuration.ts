export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),

  database: {
    url: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL !== 'false',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  cors: {
    // Origen del frontend (Vue/Vite) que puede llamar a esta API
    // desde el navegador. Lista separada por comas; por defecto solo
    // el puerto por defecto de "vite dev" en local.
    origins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },

  security: {
    encryptionKey: process.env.ENCRYPTION_KEY,
    phoneSalt: process.env.PHONE_SALT,
  },

  timezone: process.env.TZ ?? 'America/Hermosillo',
});
