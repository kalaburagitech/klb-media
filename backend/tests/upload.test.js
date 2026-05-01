import { buildApp } from './helper.js';

describe('Upload API', () => {
  let app;

  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  test('POST /api/upload should return 401 if no credentials', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/upload'
    });
    expect(response.statusCode).toBe(401);
  });
});
