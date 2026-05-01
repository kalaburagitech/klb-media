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
    
    // Test connection with timeout
    const pingPromise = fastify.redis.ping();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis ping timeout')), 5000)
    );
    
    await Promise.race([pingPromise, timeoutPromise]);
    fastify.log.info('Connected to Redis');
  } catch (err) {
    fastify.log.error('Failed to connect to Redis: ' + err.message);
  }
});
