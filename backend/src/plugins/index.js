import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { dbPlugin } from './db.js';
import { authMiddleware } from '../middlewares/auth.js';

export const registerPlugins = async (fastify) => {
  // CORS
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || '*',
  });

  // Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
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
        description: 'Media storage and delivery platform API documentation',
        version: '1.0.0',
      },
      servers: [
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
