// server/test_sql.js
(async () => {
    try {
        const db = require('./lib/db');
        // 尝试 count
        console.log('[test] running count...');
        const [cnt] = await db.execute('SELECT COUNT(*) AS total FROM articles WHERE deleted = 0', []);
        console.log('[test] count result sample:', Array.isArray(cnt) ? cnt[0] : cnt);

        // 尝试 list with placeholders (this may fail)
        console.log('[test] running prepared LIMIT ? OFFSET ?');
        const listSql = 'SELECT id, title, summary, author, created_at FROM articles WHERE deleted = 0 ORDER BY id DESC LIMIT ? OFFSET ?';
        try {
            const [rows] = await db.execute(listSql, [10, 0]);
            console.log('[test] prepared list rows length:', (rows && rows.length) ? rows.length : 0);
        } catch (e) {
            console.error('[test] prepared list error ->', e && (e.stack || e.message || e));
        }

        // 尝试 list with numeric interpolation (workaround)
        console.log('[test] running interpolated LIMIT');
        const limit = 10, offset = 0;
        const listSql2 = `SELECT id, title, summary, author, created_at FROM articles WHERE deleted = 0 ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
        const [rows2] = await db.execute(listSql2, []);
        console.log('[test] interpolated list rows length:', (rows2 && rows2.length) ? rows2.length : 0);

        process.exit(0);
    } catch (err) {
        console.error('[test] fatal err', err && (err.stack || err.message || err));
        process.exit(1);
    }
})();
