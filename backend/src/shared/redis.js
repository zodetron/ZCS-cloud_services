import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from './logger.js';

const redisOptions = {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  lazyConnect: true,
};

export const redis = config.redis.url
  ? new Redis(config.redis.url, redisOptions)
  : new Redis({ host: config.redis.host, port: config.redis.port, password: config.redis.password, ...redisOptions });

redis.on('connect', () => logger.info('Redis connected'));
redis.on('error', (err) => logger.error('Redis error', { err: err.message }));
