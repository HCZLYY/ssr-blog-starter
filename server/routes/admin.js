const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const db = require('../lib/db');

const ADMIN_USER = process.env.ADMIN_USER || 'LYY';
const ADMIN_PASS = process.env.ADMIN_PASS || '20035313Aa';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'my-admin-token';
const ADMIN_USER_ID = Number(process.env.ADMIN_USER_ID || 1);

function extractToken(req) {
    const headerToken = req.headers['x-admin-token'];
    if (headerToken) return headerToken;
    const authHeader = req.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    if (req.cookies && req.cookies.admin_token) {
        return req.cookies.admin_token;
    }
    return null;
}

function requireAdmin(req, res, next) {
    const token = extractToken(req);
    if (token !== ADMIN_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

const apiLimiter = rateLimit({
    windowMs: 30 * 1000,
    max: 30
});

router.post('/login', apiLimiter, async (req, res) => {
    const { username, password } = req.body || {};
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.cookie('admin_token', ADMIN_TOKEN, {
            httpOnly: true,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.json({ token: ADMIN_TOKEN, username: ADMIN_USER });
    }
    return res.status(400).json({ error: '账号或密码错误' });
});

router.post('/logout', (req, res) => {
    res.clearCookie('admin_token');
    res.json({ ok: true });
});

router.get('/articles', requireAdmin, async (req, res) => {
    try {
        const sql = `SELECT id, title, summary, author, content, status, tags, created_at, updated_at
                     FROM articles WHERE deleted = 0 ORDER BY id DESC`;
        const [items] = await db.execute(sql);
        res.json({ items });
    } catch (e) {
        console.error('[admin] fetch articles error', e);
        res.status(500).json({ error: e.message });
    }
});

router.post('/articles', requireAdmin, async (req, res) => {
    const { title, content = '', summary = '', author = '', status = 'published', tags = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: '标题必填' });
    const normalizedStatus = (status || 'published').toLowerCase();
    if (!['published', 'draft'].includes(normalizedStatus)) {
        return res.status(400).json({ error: 'status invalid' });
    }
    const tagsValue = Array.isArray(tags) ? tags.join(',') : String(tags || '');
    try {
        const sql = `INSERT INTO articles (user_id, title, content, summary, author, status, tags, created_at, deleted)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`;
        const [result] = await db.execute(sql, [ADMIN_USER_ID, title, content, summary, author || ADMIN_USER, normalizedStatus, tagsValue]);
        res.status(201).json({ id: result.insertId, title, summary, author, status: normalizedStatus, tags: tagsValue });
    } catch (e) {
        console.error('[admin] create error', e);
        res.status(500).json({ error: e.message });
    }
});

router.put('/articles/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    const { title, content = '', summary = '', author = '', status = 'published', tags = '' } = req.body || {};
    if (!title) return res.status(400).json({ error: '标题必填' });
    const normalizedStatus = (status || 'published').toLowerCase();
    if (!['published', 'draft'].includes(normalizedStatus)) {
        return res.status(400).json({ error: 'status invalid' });
    }
    const tagsValue = Array.isArray(tags) ? tags.join(',') : String(tags || '');
    try {
        const sql = `UPDATE articles SET title=?, content=?, summary=?, author=?, status=?, tags=? WHERE id=? AND deleted = 0`;
        const [result] = await db.execute(sql, [title, content, summary, author, normalizedStatus, tagsValue, id]);
        if ((result.affectedRows || 0) === 0) return res.status(404).json({ error: '未找到文章' });
        res.json({ ok: true, id, status: normalizedStatus, tags: tagsValue });
    } catch (e) {
        console.error('[admin] update error', e);
        res.status(500).json({ error: e.message });
    }
});

router.delete('/articles/:id', requireAdmin, async (req, res) => {
    const id = Number(req.params.id || 0);
    if (!id) return res.status(400).json({ error: 'invalid id' });
    try {
        const sql = 'UPDATE articles SET deleted = 1 WHERE id = ?';
        const [result] = await db.execute(sql, [id]);
        if ((result.affectedRows || 0) === 0) return res.status(404).json({ error: '未找到文章' });
        res.json({ ok: true, id });
    } catch (e) {
        console.error('[admin] delete error', e);
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
