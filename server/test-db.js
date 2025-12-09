// server/test-db.js
require('dotenv').config({ path: './server/.env' });
const mysql = require('mysql2/promise');

(async () => {
    try {
        const cfg = {
            host: process.env.DATABASE_HOST,
            port: Number(process.env.DATABASE_PORT || 3306),
            user: process.env.DATABASE_USER,
            password: process.env.DATABASE_PASSWORD,
            database: process.env.DATABASE_NAME,
            waitForConnections: true,
            connectionLimit: 5,
            queueLimit: 0
        };
        console.log('Using DB config:', cfg);
        const pool = mysql.createPool(cfg);
        const [rows] = await pool.query("SELECT CURRENT_USER(), USER(), CONNECTION_ID()");
        console.log('SELECT CURRENT_USER() result:', rows);
        // 尝试调用你 app 在 renderPage 中用的那条 SQL（与错误日志相关）
        const [rows2] = await pool.query("SELECT id, title, summary, author, created_at FROM articles ORDER BY id DESC LIMIT 1");
        console.log('sample article row:', rows2);
        await pool.end();
        process.exit(0);
    } catch (e) {
        console.error('DB test error:', e && (e.stack || e.message));
        process.exit(1);
    }
})();
