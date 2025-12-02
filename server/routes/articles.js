const express = require('express');
const router = express.Router();
const db = require('../services/db');
const { cacheGet, cacheSet, cacheDel } = require('../services/cache');

// 列表（分页）
router.get('/', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const pageSize = Math.max(1, parseInt(req.query.pageSize || '10'));
    const offset = (page - 1) * pageSize;
    const cacheKey = `articles:page:${page}:size:${pageSize}`;
    try {
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT id, title, summary, author_id, created_at FROM articles WHERE status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?', ['published', pageSize, offset]);
        await cacheSet(cacheKey, rows, 30);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.json({ degraded: true, data: [] });
    }
});

// 详情
router.get('/:id', async (req, res) => {
    const id = req.params.id;
    const cacheKey = `article:${id}`;
    try {
        const cached = await cacheGet(cacheKey);
        if (cached) return res.json(cached);

        const [rows] = await db.query('SELECT * FROM articles WHERE id = ? AND status = ?', [id, 'published']);
        const article = rows[0] || null;
        if (!article) return res.status(404).json({ message: 'not found' });
        await cacheSet(cacheKey, article, 300);
        res.json(article);
    } catch (err) {
        console.error(err);
        res.status(200).json({ degraded: true, id });
    }
});

// 新增（简化，无 auth）
router.post('/', async (req, res) => {
    const { title, summary, content, author_id = 1, status = 'draft' } = req.body;
    try {
        const [result] = await db.query('INSERT INTO articles (title, summary, content, author_id, status) VALUES (?, ?, ?, ?, ?)', [title, summary, content, author_id, status]);
        await cacheDel('articles:page:1:size:10');
        res.json({ id: result.insertId });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'db error' });
    }
});

// 更新
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { title, summary, content, status } = req.body;
    try {
        await db.query('UPDATE articles SET title=?, summary=?, content=?, status=?, updated_at=NOW() WHERE id=?', [title, summary, content, status, id]);
        await cacheDel(`article:${id}`);
        await cacheDel('articles:page:1:size:10');
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'update error' });
    }
});

// 删除（逻辑删除）
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    try {
        await db.query('UPDATE articles SET status = ?, deleted_at = NOW() WHERE id=?', ['deleted', id]);
        await cacheDel(`article:${id}`);
        await cacheDel('articles:page:1:size:10');
        res.json({ ok: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'delete error' });
    }
});

module.exports = router;
