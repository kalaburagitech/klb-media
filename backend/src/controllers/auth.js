import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const signup = async (request, reply) => {
  const { email, password } = request.body;

  try {
    request.log.info(`Attempting signup for email: ${email}`);
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = crypto.randomBytes(32).toString('hex');

    const { rows } = await request.server.db.query(
      'INSERT INTO media_users (id, email, password, api_key) VALUES ($1, $2, $3, $4) RETURNING id, email, api_key',
      [id, email, hashedPassword, apiKey]
    );

    const user = rows[0];
    request.log.info(`Signup successful for user ID: ${user.id}`);
    const token = request.server.jwt.sign({ id: user.id, email: user.email });

    return { token, user };
  } catch (err) {
    if (err.code === '23505') {
      request.log.warn(`Signup failed: Email already exists: ${email}`);
      return reply.status(400).send({ error: 'Email already exists' });
    }
    request.log.error('Signup error:', err);
    return reply.status(500).send({ error: 'Internal server error during signup' });
  }
};

export const login = async (request, reply) => {
  const { email, password } = request.body;

  try {
    const { rows } = await request.server.db.query(
      'SELECT * FROM media_users WHERE email = $1',
      [email]
    );

    const user = rows[0];
    if (!user) {
      request.log.warn(`Login attempt for non-existent user: ${email}`);
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      request.log.warn(`Invalid password for user: ${email}`);
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const token = request.server.jwt.sign({ id: user.id, email: user.email });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        api_key: user.api_key
      }
    };
  } catch (err) {
    request.log.error('Login error:', err);
    return reply.status(500).send({ 
      error: 'Internal server error during login',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

export const getMe = async (request, reply) => {
  const { rows } = await request.server.db.query(
    'SELECT id, email, api_key, created_at FROM media_users WHERE id = $1',
    [request.user.id]
  );
  return rows[0];
};
