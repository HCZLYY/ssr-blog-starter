'use strict';

const express = require('express');
const router = express.Router();
const db = require('../lib/db');
let redis;
try { redis = require('../lib/redis'); } catch (e) { redis = null; }

const DEFAULT_USER_ID = Number(process.env.DEFAULT_AUTHOR_ID || process.env.ADMIN_USER_ID || 1);

const LIST_CACHE_PREFIX = 'articles:list';
const DETAIL_CACHE_PREFIX = 'articles:detail';
const LIST_CACHE_TTL = 60;
const DETAIL_CACHE_TTL = 120;

function safeNumber(v, defaultVal = 0) {
    const n = Number(v);
    return Number.isFinite(n) && !Number.isNaN(n) ? Math.trunc(n) : defaultVal;
}

function parseTags(value) {
    if (!value) return [];
    const list = Array.isArray(value) ? value : String(value).split(',');
    const set = new Set();
    list.forEach(item => {
        String(item).split(',').forEach(seg => {
            const trimmed = seg.trim();
            if (trimmed) set.add(trimmed);
        });
    });
    return Array.from(set);
}

function buildTagString(value) {
    return parseTags(value).join(',');
}

function buildSearchPattern(raw = '') {
    if (!raw) return '';
    const escaped = raw.replace(/[\\%_]/g, ch => '\\' + ch);
    return `%${escaped}%`;
}

async function execSQL(sql, params = []) {
    return db.execute(sql, params);
}

async function clearArticleCache(id) {
    try {
        if (!redis || !redis.del) return;
        await redis.del(`${DETAIL_CACHE_PREFIX}:${id}`).catch(() => { });
    } catch (e) { }
}

async function clearListCache() {
    try {
        if (!redis || !redis.client || typeof redis.client.keys !== 'function') return;
        const keys = await redis.client.keys(`${LIST_CACHE_PREFIX}:*`);
        if (keys && keys.length) {
            await redis.client.del(keys).catch(() => { });
        }
    } catch (e) {
        console.warn('[articles] clearListCache error', e && e.message);
    }
}

async function loadAvailableTags(statusFilter = 'published') {
    const params = [];
    let where = 'deleted = 0';
    if (statusFilter !== 'all') {
        where += ' AND status = ?';
        params.push(statusFilter);
    }
    const sql = `SELECT tags FROM articles WHERE ${where}`;
    const [rows] = await execSQL(sql, params);
    const tagSet = new Set();
    (rows || []).forEach(row => {
        parseTags(row.tags).forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
}

router.get('/', async (req, res) => {
    const page = Math.max(1, safeNumber(req.query.page, 1));
    const limit = Math.max(1, Math.min(200, safeNumber(req.query.limit, 10)));
    const offset = (page - 1) * limit;
    const tagFilter = (req.query.tag || '').trim();
    const searchRaw = (req.query.search || '').trim();
    const searchPattern = buildSearchPattern(searchRaw);
    const statusParam = (req.query.status || 'published').toLowerCase();
    const allowedStatus = ['published', 'draft', 'all'];
    const statusFilter = allowedStatus.includes(statusParam) ? statusParam : 'published';
    const allowedSortFields = { id: 'id', created_at: 'created_at', title: 'title', views: 'views' };
    const sortBy = (req.query.sort_by || 'created_at').toLowerCase();
    const sortField = allowedSortFields[sortBy] || 'created_at';
    const sortDir = (req.query.sort_dir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const cacheKey = `${LIST_CACHE_PREFIX}:page:${page}:limit:${limit}:status:${statusFilter}:sort:${sortField}:${sortDir}:tag:${tagFilter || 'all'}:search:${searchRaw || 'none'}`;
    if (redis && redis.get) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(JSON.parse(cached));
        } catch (e) {
            console.warn('[articles] list cache read fail', e && e.message);
        }
    }

    try {
        const params = [];
        let where = 'deleted = 0';
        if (statusFilter !== 'all') {
            where += ' AND status = ?';
            params.push(statusFilter);
        }
        if (tagFilter) {
            where += ' AND FIND_IN_SET(?, tags) > 0';
            params.push(tagFilter);
        }
        if (searchRaw) {
            where += ` AND (title LIKE ? ESCAPE '\\\\' OR summary LIKE ? ESCAPE '\\\\' OR content LIKE ? ESCAPE '\\\\')`;
            params.push(searchPattern, searchPattern, searchPattern);
        }
        const countSql = `SELECT COUNT(*) AS total FROM articles WHERE ${where}`;
        const [countRows] = await execSQL(countSql, params);
        const total = countRows && countRows[0] ? countRows[0].total : 0;

        const listSql = `SELECT id, title, summary, author, created_at, status, tags
                         FROM articles
                         WHERE ${where}
                         ORDER BY ${sortField} ${sortDir}
                         LIMIT ${limit} OFFSET ${offset}`;
        const [items] = await execSQL(listSql, params);
        const availableTags = await loadAvailableTags(statusFilter);
        const payload = {
            page,
            limit,
            total,
            tag: tagFilter || null,
            status: statusFilter,
            sort_by: sortField,
            sort_dir: sortDir,
            search: searchRaw,
            items: items || [],
            availableTags
        };

        if (redis && redis.set) {
            redis.set(cacheKey, JSON.stringify(payload), LIST_CACHE_TTL).catch(() => { });
        }
        res.json(payload);
    } catch (err) {
        console.error('[articles] list error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });

    const cacheKey = `${DETAIL_CACHE_PREFIX}:${id}`;
    if (redis && redis.get) {
        try {
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(JSON.parse(cached));
        } catch (e) {
            console.warn('[articles] detail cache read fail', e && e.message);
        }
    }

    try {
        const sql = `SELECT id, title, content, summary, author, status, tags, created_at
                     FROM articles WHERE id = ? AND deleted = 0 LIMIT 1`;
        const [rows] = await execSQL(sql, [id]);
        const row = rows && rows[0] ? rows[0] : null;
        if (!row) return res.status(404).json({ message: 'Not found' });
        if (redis && redis.set) {
            redis.set(cacheKey, JSON.stringify(row), DETAIL_CACHE_TTL).catch(() => { });
        }
        res.json(row);
    } catch (err) {
        console.error('[articles] detail error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

router.post('/', async (req, res) => {
    const { title, content = '', summary = '', author = '', status = 'published', tags = '' } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });
    const normalizedStatus = (status || 'published').toLowerCase();
    if (!['published', 'draft'].includes(normalizedStatus)) {
        return res.status(400).json({ message: 'invalid status' });
    }
    const tagsValue = buildTagString(tags);
    try {
        const sql = `INSERT INTO articles (user_id, title, content, summary, author, status, tags, created_at, deleted)
                     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), 0)`;
        const [result] = await execSQL(sql, [DEFAULT_USER_ID, title, content, summary, author, normalizedStatus, tagsValue]);
        await clearListCache();
        res.status(201).json({ id: result.insertId, title, summary, author, status: normalizedStatus, tags: tagsValue });
    } catch (err) {
        console.error('[articles] create error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    const { title, content = '', summary = '', author = '', status = 'published', tags = '' } = req.body || {};
    if (!title) return res.status(400).json({ message: 'title required' });
    const normalizedStatus = (status || 'published').toLowerCase();
    if (!['published', 'draft'].includes(normalizedStatus)) {
        return res.status(400).json({ message: 'invalid status' });
    }
    const tagsValue = buildTagString(tags);
    try {
        const sql = `UPDATE articles SET title = ?, content = ?, summary = ?, author = ?, status = ?, tags = ?
                     WHERE id = ? AND deleted = 0`;
        const [result] = await execSQL(sql, [title, content, summary, author, normalizedStatus, tagsValue, id]);
        if ((result.affectedRows || 0) === 0) return res.status(404).json({ message: 'Not found' });
        await clearArticleCache(id);
        await clearListCache();
        res.json({ ok: true, id, status: normalizedStatus, tags: tagsValue });
    } catch (err) {
        console.error('[articles] update error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    const id = safeNumber(req.params.id, 0);
    if (!id) return res.status(400).json({ message: 'Invalid id' });
    try {
        const sql = 'UPDATE articles SET deleted = 1 WHERE id = ?';
        const [result] = await execSQL(sql, [id]);
        if ((result.affectedRows || 0) === 0) return res.status(404).json({ message: 'Not found' });
        await clearArticleCache(id);
        await clearListCache();
        res.json({ ok: true, id });
    } catch (err) {
        console.error('[articles] delete error:', err);
        res.status(500).json({ message: 'Internal Server Error', error: err.message });
    }
});

module.exports = router;
