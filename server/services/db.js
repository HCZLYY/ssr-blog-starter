// server/services/db.js  （示例）
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: process.env.DATABASE_PORT ? Number(process.env.DATABASE_PORT) : 3306,
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || 'rootpass',
    database: process.env.DATABASE_NAME || 'ssr_blog',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // 关键：让 client↔server 用 utf8mb4
    charset: 'utf8mb4_general_ci' // 或 'utf8mb4'（mysql2 接受 charset 或 charset/collation）
});

// 确保每个新连接都执行 SET NAMES utf8mb4
pool.on && pool.on('connection', (conn) => {
    // mysql2 promise pool on('connection') may not be available in some versions — fallback below
    conn.query("SET NAMES utf8mb4");
});

// 备用：在每次查询前也可执行（不太必要，但保险）
async function query(sql, params) {
    const conn = await pool.getConnection();
    try {
        await conn.query("SET NAMES utf8mb4");
        const [rows] = await conn.query(sql, params);
        conn.release();
        return [rows];
    } catch (e) {
        conn.release();
        throw e;
    }
}

module.exports = {
    pool,
    query
};
