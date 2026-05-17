import { config as loadEnv } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Load from root .env (monorepo: backend/src/config → root is 3 levels up).
// In Docker, process.env is already populated by docker-compose env_file — dotenv
// silently ignores a missing file and never overwrites existing env vars.
const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.BACKEND_PORT || '4000'),
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/storagecloud',
  },

  redis: {
    url: process.env.REDIS_URL || null,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  minio: {
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000'),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    bucket: process.env.MINIO_DEFAULT_BUCKET || 'storagecloud',
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-in-production',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
  },

  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000'),
    window: parseInt(process.env.RATE_LIMIT_WINDOW || '60000'),
  },
};
