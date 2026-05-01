import { getMediaList, getMediaById, deleteMedia, getVideoStream, downloadMedia } from '../controllers/media.js';

export const mediaRoutes = async (fastify) => {
  fastify.get('/', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['media'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1 },
          limit: { type: 'integer', default: 10 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  user_id: { type: 'string', format: 'uuid' },
                  file_name: { type: 'string' },
                  size: { type: 'string' },
                  content_type: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' }
              }
            }
          }
        }
      }
    },
    handler: getMediaList,
  });

  fastify.get('/:id', {
    // Public access for streaming
    schema: {
      tags: ['media'],
      summary: 'Get media file stream',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: getMediaById,
  });

  fastify.get('/:id/stream/*', {
    // Public access for HLS streaming
    schema: {
      tags: ['media'],
      summary: 'Get HLS video stream',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: getVideoStream,
  });

  fastify.get('/:id/download', {
    // Public access for download
    schema: {
      tags: ['media'],
      summary: 'Download media file',
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: downloadMedia,
  });

  fastify.delete('/:id', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['media'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
      },
    },
    handler: deleteMedia,
  });

  fastify.get('/stats', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['media'],
      security: [{ bearerAuth: [] }, { apiKey: [] }],
    },
    handler: async (request) => {
      const { rows } = await request.server.db.query(
        'SELECT COUNT(*) as total_files, SUM(size) as total_size FROM media_files WHERE user_id = $1',
        [request.user.id]
      );
      return rows[0];
    }
  });
};
