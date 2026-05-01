import { buildApp } from './helper.js';
import * as s3Service from '../src/services/s3.js';

// Mock S3 Service
jest.mock('../src/services/s3.js', () => ({
  getFromS3: jest.fn(),
  uploadToS3: jest.fn(),
  deleteFromS3: jest.fn()
}));

describe('Media API', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  test('GET /api/media should return 401 if unauthorized', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/media'
    });
    expect(response.statusCode).toBe(401);
  });

  test('GET /api/media/:id should return 404 if file not found in DB', async () => {
    app.db.query.mockResolvedValueOnce({ rows: [] });

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/00000000-0000-0000-0000-000000000000'
    });

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.payload).error).toBe('Media not found');
  });

  test('GET /api/media/:id should stream file if found', async () => {
    const mockFile = {
      id: 'uuid-1',
      file_name: 'test.png',
      storage_key: 'key-1',
      content_type: 'image/png'
    };

    app.db.query.mockResolvedValueOnce({ rows: [mockFile] });
    s3Service.getFromS3.mockResolvedValueOnce(Buffer.from('fake-binary-content'));

    const response = await app.inject({
      method: 'GET',
      url: '/api/media/uuid-1'
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toBe('image/png');
  });
});
