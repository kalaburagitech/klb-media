import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import redis from '@fastify/redis';
import rateLimit from '@fastify/rate-limit';
import { dbPlugin } from './db.js';
import { redisPlugin } from './redis.js';
import { authMiddleware } from '../middlewares/auth.js';

export const registerPlugins = async (fastify) => {
  // CORS
  await fastify.register(cors, {
    origin: [
      'http://localhost:3000',
      'https://klb-media.vercel.app',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
  });

  // Custom Redis Plugin (Handles connection + logging)
  await fastify.register(redisPlugin);

  // Rate Limit
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    redis: fastify.redis,
    allowList: ['127.0.0.1'],
    continueExceeding: true,
    skipOnError: true,
  });

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 200 * 1024 * 1024, // 200MB cap for video
    },
  });

  // JWT
  await fastify.register(jwt, {
    secret: process.env.JWT_SECRET || 'supersecret',
  });

  // Swagger
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'KLB Media Service API',
        description: 'Production-grade media storage and delivery platform',
        version: '1.0.0',
      },
      servers: [
        {
          url: `https://klb-media-production.up.railway.app`,
          description: 'Production server',
        },
        {
          url: `http://localhost:${process.env.PORT || 5000}`,
          description: 'Development server',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header',
          },
        },
      },
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });

  // Custom DB Plugin
  await fastify.register(dbPlugin);

  // Decorate fastify with auth middleware
  fastify.decorate('authenticate', authMiddleware);
};
