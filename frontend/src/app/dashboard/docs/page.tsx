'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function DocsPage() {
  const convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || 'https://cautious-alligator-235.convex.site';

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'KLB Media Service API',
      description: 'API for uploading and retrieving media files.',
      version: '1.0.0',
    },
    servers: [
      {
        url: convexSiteUrl,
        description: 'Convex HTTP Actions Server',
      },
    ],
    paths: {
      '/api/media': {
        get: {
          summary: 'List all media',
          description: 'Returns a list of all media files currently in the database.',
          responses: {
            '200': {
              description: 'A JSON array of media items',
            },
          },
        },
      },
      '/api/media/{id}': {
        get: {
          summary: 'Get a specific media file',
          description: 'Redirects to the raw file URL in Convex Storage.',
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
              },
              description: 'The Convex storage ID of the file.',
            },
          ],
          responses: {
            '302': {
              description: 'Redirects to the file',
            },
            '404': {
              description: 'File not found',
            },
          },
        },
      },
      '/api/upload': {
        post: {
          summary: 'Upload a new media file',
          description: 'Uploads a file directly to Convex Storage. Send the raw binary file in the request body.',
          requestBody: {
            required: true,
            content: {
              'application/octet-stream': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
              'image/jpeg': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
              'image/png': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
              'video/mp4': {
                schema: {
                  type: 'string',
                  format: 'binary',
                },
              },
            },
          },
          responses: {
            '201': {
              description: 'File successfully uploaded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean' },
                      storageId: { type: 'string' },
                      url: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': {
              description: 'Empty file provided',
            },
            '500': {
              description: 'Failed to store file',
            },
          },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <div className="p-4">
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}
