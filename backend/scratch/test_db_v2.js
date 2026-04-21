const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

async function testConnection(params) {
  const pool = new Pool(params);
  try {
    const res = await pool.query('SELECT 1');
    console.log(`✅ Success with params:`, JSON.stringify(params));
    await pool.end();
    return true;
  } catch (err) {
    console.error(`❌ Failed with params:`, JSON.stringify(params), err.message);
    await pool.end();
    return false;
  }
}

async function run() {
  console.log('Testing with DATABASE_URL:', process.env.DATABASE_URL);
  await testConnection({ connectionString: process.env.DATABASE_URL });
  
  console.log('Testing with explicit params (admin@123):');
  await testConnection({
    user: 'postgres',
    host: 'localhost',
    database: 'agentic_assessment',
    password: 'admin@123',
    port: 5432,
  });

  console.log('Testing with explicit params (postgres/postgres):');
  await testConnection({
    user: 'postgres',
    host: 'localhost',
    database: 'agentic_assessment',
    password: 'postgres',
    port: 5432,
  });

  console.log('Testing with explicit params (no password/trust):');
  await testConnection({
    user: 'postgres',
    host: 'localhost',
    database: 'agentic_assessment',
    port: 5432,
  });
}

run();
