'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function DocsPage() {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_MEDIA_API_URL ||
    process.env.NEXT_PUBLIC_CONVEX_SITE_URL ||
    'https://silent-ibis-390.convex.site';

  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'KLB Media Service API',
      description:
        'Production media API on Cloudflare R2. Default mode: originals only (images, PDF, audio, video). FFmpeg transcoding available for video when enabled.',
      version: '2.0.0',
    },
    servers: [{ url: apiBaseUrl, description: 'Media API (Convex HTTP / Cloudflare Worker)' }],
    paths: {
      '/api/media': {
        get: {
          summary: 'List all media',
          parameters: [
            { name: 'search', in: 'query', schema: { type: 'string' } },
            { name: 'status', in: 'query', schema: { type: 'string', enum: ['pending', 'uploading', 'processing', 'ready', 'failed'] } },
            { name: 'type', in: 'query', schema: { type: 'string', enum: ['image', 'video', 'audio', 'document'] } },
          ],
          responses: { '200': { description: 'Media list JSON' } },
        },
      },
      '/api/media/{id}': {
        get: {
          summary: 'Get media file (redirect) or metadata',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string' } },
            { name: 'variant', in: 'query', schema: { type: 'string', example: '720p' } },
            { name: 'format', in: 'query', schema: { type: 'string', enum: ['redirect', 'json'] } },
          ],
          responses: {
            '302': { description: 'Redirect to CDN URL' },
            '200': { description: 'JSON metadata when format=json' },
          },
        },
      },
      '/api/upload/init': {
        post: {
          summary: 'Initialize presigned R2 upload',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['fileName', 'contentType'],
                  properties: {
                    fileName: { type: 'string' },
                    contentType: { type: 'string' },
                    size: { type: 'number' },
                    userId: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: { '201': { description: 'Presigned upload URL + mediaId' } },
        },
      },
      '/api/upload/complete': {
        post: {
          summary: 'Complete upload and start transcoding',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['mediaId'],
                  properties: {
                    mediaId: { type: 'string' },
                    size: { type: 'number' },
                  },
                },
              },
            },
          },
          responses: { '200': { description: 'Processing started' } },
        },
      },
      '/api/upload': {
        post: {
          summary: 'Direct upload (legacy)',
          description: 'Upload raw binary directly. Prefer init + PUT + complete for large files.',
          requestBody: {
            required: true,
            content: {
              'application/octet-stream': { schema: { type: 'string', format: 'binary' } },
              'video/mp4': { schema: { type: 'string', format: 'binary' } },
              'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            },
          },
          responses: { '201': { description: 'Upload accepted, transcoding queued' } },
        },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-800">API Reference</h2>
        <p className="text-sm text-slate-600 mt-1">
          Default: originals only (1 file per upload, 10 GB free tier friendly). Video transcoding (MP4/HLS) available when TRANSCODING_ENABLED=true.
        </p>
      </div>
      <div className="p-4">
        <SwaggerUI spec={spec} />
      </div>
    </div>
  );
}
