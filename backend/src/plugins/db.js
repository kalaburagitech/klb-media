import fp from 'fastify-plugin';
import pg from 'pg';

const { Pool } = pg;

export const dbPlugin = fp(async (fastify) => {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Test connection
  try {
    const client = await pool.connect();
    fastify.log.info('Connected to PostgreSQL');
    client.release();
  } catch (err) {
    fastify.log.error('Failed to connect to PostgreSQL: ' + err.message);
  }

  fastify.decorate('db', pool);

  fastify.addHook('onClose', async (instance) => {
    await instance.db.end();
  });

  // Initial tables creation
  try {
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS media_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        api_key TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS media_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES media_users(id) ON DELETE CASCADE,
        file_name TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        size BIGINT NOT NULL,
        content_type TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Migration: Rename columns if they exist from previous version
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_files' AND column_name='url') THEN
          ALTER TABLE media_files RENAME COLUMN url TO storage_key;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='media_files' AND column_name='type') THEN
          ALTER TABLE media_files RENAME COLUMN type TO content_type;
        END IF;
      END $$;

      CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
      CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON media_files(created_at);
    `);
    fastify.log.info('Database tables initialized');
  } catch (err) {
    fastify.log.error('Database initialization failed: ' + err.message);
    console.error(err);
  }
});
