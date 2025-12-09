/**
 * server/db_test.js
 * Run with: node server\db_test.js
 */
const path = require('path');
const envPath = path.resolve(__dirname, '.env'); // server/.env
require('dotenv').config({ path: envPath });
console.log('[db_test] loaded env from', envPath);
console.log('[db_test] DB env ->', { DATABASE_HOST: process.env.DATABASE_HOST, DATABASE_PORT: process.env.DATABASE_PORT, DATABASE_USER: process.env.DATABASE_USER ? '***' : '(empty)', DATABASE_NAME: process.env.DATABASE_NAME });

const mysql = require('mysql2/promise');

(async ()=>{
  try {
    const pool = mysql.createPool({
      host: process.env.DATABASE_HOST || '127.0.0.1',
      port: Number(process.env.DATABASE_PORT || 3306),
      user: process.env.DATABASE_USER || 'root',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'ssr_blog',
      connectionLimit: 1
    });
    const [rows] = await pool.execute('SELECT USER() AS user, CURRENT_USER() AS current_user');
    console.log('[db_test] mysql ->', rows && rows[0]);
    await pool.end();
  } catch (e) {
    console.error('[db_test] mysql ERROR ->', e && (e.stack || e.message));
  }
})();
