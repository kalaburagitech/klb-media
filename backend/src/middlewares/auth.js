export const authMiddleware = async (request, reply) => {
  try {
    // Check for API Key first
    const apiKey = request.headers['x-api-key'];
    if (apiKey) {
      const { rows } = await request.server.db.query(
        'SELECT id, email FROM media_users WHERE api_key = $1',
        [apiKey]
      );
      if (rows.length > 0) {
        request.user = rows[0];
        return;
      }
    }

    // Fallback to JWT
    await request.jwtVerify();
  } catch (err) {
    reply.status(401).send({ error: 'Unauthorized', message: 'Invalid credentials or API key' });
  }
};
