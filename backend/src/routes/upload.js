import { uploadFile } from '../controllers/upload.js';

export const uploadRoutes = async (fastify) => {
  fastify.post('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['upload'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      // multipart validation is handled in the controller
      response: {
        200: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' }
          }
        }
      }
    },
    handler: uploadFile,
  });
};
