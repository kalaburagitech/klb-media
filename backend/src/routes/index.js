import { authRoutes } from './auth.js';
import { mediaRoutes } from './media.js';
import { uploadRoutes } from './upload.js';

export const registerRoutes = async (fastify) => {
  await fastify.register(authRoutes, { prefix: '/api/auth' });
  await fastify.register(mediaRoutes, { prefix: '/api/media' });
  await fastify.register(uploadRoutes, { prefix: '/api/upload' });
};
