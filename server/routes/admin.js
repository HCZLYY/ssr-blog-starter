// server/routes/admin.js
const express = require('express');
const router = express.Router();
const db = require('../lib/db');  // 你原来的数据库模块
const rateLimit = require('express-rate-limit');

// 简单 token（你可改强一点）
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || '123456';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'my-admin-token';

// 中间件：必须带 token
function requireAdmin(req, res, next) {
    const token = req.headers['x-admin-token'];
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// 限流
const apiLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 30,
});

// -------------------- 登录 --------------------
router.post('/login', apiLimiter, async (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USER && password === ADMIN_PASS) {
        return res.json({
            token: ADMIN_TOKEN,
            username: ADMIN_USER,
        });
    }

    return res.status(400).json({ error: '账号或密码错误' });
});

// -------------------- 获取全部文章 --------------------
router.get('/articles', requireAdmin, async (req, res) => {
    try {
        const sql = `SELECT id, title, content, created_at FROM articles ORDER BY id DESC`;
        const items = await db.query(sql);
        res.json({ items });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------- 新增文章 --------------------
router.post('/articles', requireAdmin, async (req, res) => {
    const { title, content } = req.body;

    if (!title) return res.status(400).json({ error: '标题必填' });

    try {
        const sql = `INSERT INTO articles (title, content) VALUES (?, ?)`;
        const result = await db.query(sql, [title, content || '']);
        res.json({ id: result.insertId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------- 修改文章 --------------------
router.put('/articles/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    const { title, content } = req.body;

    try {
        const sql = `UPDATE articles SET title=?, content=? WHERE id=?`;
        await db.query(sql, [title, content, id]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------- 删除文章 --------------------
router.delete('/articles/:id', requireAdmin, async (req, res) => {
    const id = req.params.id;
    try {
        const sql = `DELETE FROM articles WHERE id=?`;
        await db.query(sql, [id]);
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
