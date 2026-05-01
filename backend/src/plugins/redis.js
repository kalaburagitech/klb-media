import fp from 'fastify-plugin';
import redis from '@fastify/redis';

export const redisPlugin = fp(async (fastify) => {
  if (!process.env.REDIS_URL) {
    fastify.log.warn('REDIS_URL not found, skipping Redis connection');
    return;
  }

  try {
    await fastify.register(redis, {
      url: process.env.REDIS_URL,
    });
    
    // Test connection
    await fastify.redis.ping();
    fastify.log.info('Connected to Redis');
  } catch (err) {
    fastify.log.error('Failed to connect to Redis: ' + err.message);
  }
});
