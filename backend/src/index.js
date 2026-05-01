import 'dotenv/config';
import Fastify from 'fastify';
import { registerPlugins } from './plugins/index.js';
import { registerRoutes } from './routes/index.js';

const fastify = Fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

const start = async () => {
  try {
    // Register Plugins
    await registerPlugins(fastify);

    // Register Routes
    await registerRoutes(fastify);

    const port = process.env.PORT || 5000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`Server listening on http://localhost:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM'];
signals.forEach((signal) => {
  process.on(signal, async () => {
    fastify.log.info(`Received ${signal}, shutting down gracefully...`);
    try {
      await fastify.close();
      fastify.log.info('Server closed');
      process.exit(0);
    } catch (err) {
      fastify.log.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
});

start();
