import * as Minio from 'minio';
import { config } from '../config/index.js';
import { logger } from './logger.js';

export const minioClient = new Minio.Client({
  endPoint: config.minio.endpoint,
  port: config.minio.port,
  useSSL: config.minio.useSSL,
  accessKey: config.minio.accessKey,
  secretKey: config.minio.secretKey,
  pathStyle: true,
});

export async function ensureMinioReady() {
  try {
    const exists = await minioClient.bucketExists(config.minio.bucket);
    if (!exists) {
      await minioClient.makeBucket(config.minio.bucket);
      logger.info(`Default bucket '${config.minio.bucket}' created`);
    }
    logger.info('MinIO connected');
  } catch (err) {
    logger.error('MinIO connection failed', { err: err.message });
  }
}
