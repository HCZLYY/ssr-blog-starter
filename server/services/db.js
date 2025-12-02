// server/services/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: process.env.DATABASE_PORT ? parseInt(process.env.DATABASE_PORT, 10) : 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'ssr_blog',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 指定字符集
    charset: 'utf8mb4',
    dateStrings: true
});

// 立即执行一次 SET NAMES，确保 mysql2 与服务器协商为 utf8mb4
(async () => {
    try {
        await pool.query("SET NAMES utf8mb4");
        console.log('DB: SET NAMES utf8mb4 executed');
    } catch (err) {
        console.error('DB: SET NAMES utf8mb4 failed', err);
    }
})();

module.exports = pool;
