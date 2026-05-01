import Fastify from 'fastify';
import { registerPlugins } from '../src/plugins/index.js';
import { registerRoutes } from '../src/routes/index.js';

export async function buildApp() {
  const fastify = Fastify();
  
  // Mock DB
  fastify.decorate('db', {
    query: jest.fn(),
    connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
    end: jest.fn()
  });

  // Mock Redis if needed
  fastify.decorate('redis', {
    get: jest.fn(),
    set: jest.fn()
  });

  await registerPlugins(fastify);
  await registerRoutes(fastify);
  
  return fastify;
}
