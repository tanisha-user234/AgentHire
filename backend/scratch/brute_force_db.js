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
    console.log(`❌ Failed with params:`, JSON.stringify(params), err.message);
    await pool.end();
    return false;
  }
}

async function run() {
  const passwords = ['admin@123', 'admin', 'password', 'postgres', 'admin123', 'root', '123456'];
  for (const pwd of passwords) {
    await testConnection({
      user: 'postgres',
      host: 'localhost',
      database: 'agentic_assessment',
      password: pwd,
      port: 5432,
    });
  }
}

run();
