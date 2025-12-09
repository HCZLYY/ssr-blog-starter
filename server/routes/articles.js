'use strict';

const express = require('express');
const router = express.Router();
const db = require('../lib/db'); // expects db.execute(sql, params)
let redis;
try { redis = require('../lib/redis'); } catch (e) { redis = null; }

function safeNumber(v, defaultVal = 0) {
    const n = Number(v);
    return Number.isFinite(n) && !Number.isNaN(n) ? Math.trunc(n) : defaultVal;
}

async function execSQL(sql, params = []) {
    console.log('[articles] SQL:', sql);
    console.log('[articles] params:', params);
    return db.execute(sql, params);
}

async function clearArticleCache(id) {
    try {
        if (!redis || !redis.del) return;
        await redis.del(`articles:detail:${id}`).catch(() => { });
    } catch (e) { }
}

async function clearListCache() {
    try {
        if (!redis || !redis.client || typeof redis.client.keys !== 'function') return;
        const keys = await redis.client.keys('articles:page:*');
        if (keys && keys.length) {
            await redis.client.del(keys).catch(() => { });
        }
    } catch (e) {
        console.warn('[articles] clearListCache error', e && e.message);
    }
}

/**
 * GET /api/v1/articles
 */
router.get('/', async (req, res) => {
    const page = Math.max(1, safeNumber(req.query.page, 1));
    const limit = Math.max(1, Math.min(200, safeNumber(req.query.limit, 10)));
    const offset = (page - 1) * limit;

    try {
        const countSql = 'SELECT COUNT(*) AS total FROM articles WHERE deleted = 0';
        const [countRows] = await execSQL(countSql);
        const total = (countRows && countRows[0]) ? countRows[0].total : 0;

        const listSql = `SELECT id, title, summary, author, created_at FROM articles WHERE deleted = 0 ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`;
        const [items] = await execSQL(listSql);

        res.json({ page, limit, total, items: items || [] });
    } catch (err) {
        console.error('[articles] list error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

/**
 * GET /api/v1/articles/:id
 */
router.get('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    try {
        const sql = 'SELECT id, title, content, summary, author, created_at FROM articles WHERE id = ? AND deleted = 0 LIMIT 1';
        const [rows] = await execSQL(sql, [id]);
        const row = rows && rows[0] ? rows[0] : null;
        if (!row) return res.status(404).json({ message: 'Not found' });

        res.json(row);
    } catch (err) {
        console.error('[articles] detail error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

/**
 * POST /api/v1/articles
 */
router.post('/', async (req, res) => {
    const { title, content = '', summary = '', author = '' } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });

    try {
        const sql = 'INSERT INTO articles (title, content, summary, author, created_at, deleted) VALUES (?, ?, ?, ?, NOW(), 0)';
        const [result] = await execSQL(sql, [title, content, summary, author]);
        const insertId = result.insertId || result.insert_id || null;

        await clearArticleCache(insertId);
        await clearListCache();
        res.status(201).json({ id: insertId, title, summary, author });
    } catch (err) {
        console.error('[articles] create error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

/**
 * PUT /api/v1/articles/:id
 */
router.put('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const { title, content = '', summary = '', author = '' } = req.body;
    if (!title) return res.status(400).json({ message: 'title required' });

    try {
        const sql = 'UPDATE articles SET title = ?, content = ?, summary = ?, author = ? WHERE id = ? AND deleted = 0';
        const [result] = await execSQL(sql, [title, content, summary, author, id]);
        const affected = result.affectedRows || result.affected_rows || 0;

        if (!affected) return res.status(404).json({ message: 'Not found' });
        await clearArticleCache(id);
        await clearListCache();
        res.json({ ok: true, id });
    } catch (err) {
        console.error('[articles] update error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

/**
 * DELETE /api/v1/articles/:id
 */
router.delete('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    try {
        const sql = 'UPDATE articles SET deleted = 1 WHERE id = ?';
        const [result] = await execSQL(sql, [id]);
        const affected = result.affectedRows || result.affected_rows || 0;

        if (!affected) return res.status(404).json({ message: 'Not found' });
        await clearArticleCache(id);
        await clearListCache();
        res.json({ ok: true, id });
    } catch (err) {
        console.error('[articles] delete error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

module.exports = router;
