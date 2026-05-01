import pg from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createUser(email, password) {
  try {
    const id = crypto.randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    const apiKey = crypto.randomBytes(32).toString('hex');

    const { rows } = await pool.query(
      'INSERT INTO media_users (id, email, password, api_key) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING RETURNING id, api_key',
      [id, email, hashedPassword, apiKey]
    );

    if (rows.length > 0) {
      console.log(`User created: ${email}`);
      console.log(`Password: ${password}`);
      console.log(`API Key: ${rows[0].api_key}`);
      console.log('-------------------');
    } else {
      console.log(`User ${email} already exists.`);
    }
  } catch (err) {
    console.error(`Error creating user ${email}:`, err.message);
  }
}

async function seed() {
  console.log('Seeding administrative accounts...');

  // Account 1: adminlogin
  await createUser('admin@klb.media', 'adminpassword123');

  // Account 2: mediaadminlogin
  await createUser('mediaadmin@klb.media', 'mediaadmin123');

  console.log('Seeding complete.');
  await pool.end();
}

seed();
