// server/ssr/renderPage.js
// 完整替换文件：服务端 SSR 渲染（list / detail）
// - 从 server/lib/db.js 读取数据（mysql2 promise pool）
// - 可选尝试用 server/lib/redis.js 做缓存（若存在）
// - 将初始数据 JSON 安全注入 HTML（防止 </script> 断开）
// - 返回完整 HTML string

const path = require('path');
const fs = require('fs');

const db = require('../lib/db'); // 你的 db 模块 (query/execute)
let redisClient = null;
try {
    // 可选：若你实现了 lib/redis.js 并导出 get/set 接口（或类似），则尝试加载
    // 如果文件不存在或导出不匹配则忽略（不影响功能）
    redisClient = require('../lib/redis'); // 期望接口： { get(key), set(key, value, ttlSeconds) }
} catch (e) {
    // 忽略：没有 redis 文件或不可用
    redisClient = null;
}

function safeSerialize(obj) {
    // JSON.stringify + 防止 </script> 问题
    return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function renderListHtml(items = [], page = 1, limit = 10) {
    // 服务端渲染的列表 HTML 片段（简单而语义化）
    const rows = items.map(a => {
        const created = a.created_at ? new Date(a.created_at).toLocaleString() : '';
        const summary = a.summary || '';
        return `<article class="article-item" data-id="${a.id}">
      <h3 class="article-title"><a href="/articles/${a.id}">${escapeHtml(a.title)}</a></h3>
      <div class="meta">作者：${escapeHtml(a.author || '')} · ${escapeHtml(created)}</div>
      <p class="summary">${escapeHtml(summary)}</p>
    </article>`;
    }).join('\n');
    return `<div id="list-root">
    <div class="server-rendered-list">${rows || '<p>暂无文章</p>'}</div>
    <nav class="pagination" id="pagination-root">
      <button data-action="prev">上一页</button>
      <span>第 ${page} 页</span>
      <button data-action="next">下一页</button>
    </nav>
  </div>`;
}

function renderDetailHtml(article) {
    if (!article) {
        return `<div id="detail-root" class="article-page empty"><p>未找到文章或已被删除</p><a class="back-link" href="/">← 返回文章列表</a></div>`;
    }
    const created = article.created_at ? new Date(article.created_at).toLocaleString() : '';
    const summary = article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : '';
    return `<div id="detail-root" class="article-page">
    <header class="article-header">
      <a class="back-link" href="/">← 返回文章列表</a>
      <h1>${escapeHtml(article.title)}</h1>
      <div class="article-meta">
        <span>作者：${escapeHtml(article.author || '佚名')}</span>
        <span>发布时间：${escapeHtml(created)}</span>
      </div>
      ${summary}
    </header>
    <article class="article-detail" data-id="${article.id}">
      <div class="content">${article.content || '<p>暂无正文内容</p>'}</div>
    </article>
  </div>`;
}

function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}



async function fetchListFromDb(page = 1, limit = 10) {
    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const sql = `SELECT id, title, summary, author, created_at FROM articles WHERE deleted = 0 ORDER BY id DESC LIMIT ?, ?`;
    // mysql2 promise pool -> returns [rows, fields]
    const [rows] = await db.query(sql, [offset, Number(limit)]);
    return rows || [];
}

async function fetchDetailFromDb(id) {
    const sql = `SELECT id, title, content, summary, author, created_at FROM articles WHERE id = ? AND deleted = 0 LIMIT 1`;
    const [rows] = await db.query(sql, [Number(id)]);
    return (rows && rows[0]) || null;
}

module.exports = async function renderPage(type, data = {}) {
    try {
        if (type === 'list') {
            const page = Number(data.page || 1);
            const limit = Number(data.limit || 10);
            const cacheKey = `articles:page:${page}:limit:${limit}`;

            let items;
            if (redisClient && typeof redisClient.get === 'function') {
                try {
                    const cached = await redisClient.get(cacheKey);
                    if (cached) {
                        items = JSON.parse(cached);
                    }
                } catch (e) {
                    // ignore redis errors and fall back to DB
                    items = null;
                }
            }

            if (!items) {
                items = await fetchListFromDb(page, limit);
                if (redisClient && typeof redisClient.set === 'function') {
                    try {
                        // cache for short time (e.g., 30s)
                        await redisClient.set(cacheKey, JSON.stringify(items), 30);
                    } catch (e) {
                        // ignore
                    }
                }
            }

            const initialState = { page, limit, items };
            const listHtml = renderListHtml(items, page, limit);
            const serialized = safeSerialize(initialState);

            return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>文章列表（SSR）</title>
    <link rel="stylesheet" href="/admin.css">
  </head>
  <body>
    <div id="app">
      <h1>文章列表（SSR）</h1>
      ${listHtml}
    </div>

    <script>window.__INITIAL_STATE__ = ${serialized};</script>
    <script src="/hydrate.js" defer></script>
  </body>
</html>`;
        } else if (type === 'detail') {
            const id = Number(data.id);
            const cacheKey = `article:${id}`;

            let article;
            if (redisClient && typeof redisClient.get === 'function') {
                try {
                    const cached = await redisClient.get(cacheKey);
                    if (cached) article = JSON.parse(cached);
                } catch (e) {
                    article = null;
                }
            }

            if (!article) {
                article = await fetchDetailFromDb(id);
                if (article && redisClient && typeof redisClient.set === 'function') {
                    try {
                        await redisClient.set(cacheKey, JSON.stringify(article), 60);
                    } catch (e) { /* ignore */ }
                }
            }

            const initialState = { article };
            const detailHtml = renderDetailHtml(article);
            const serialized = safeSerialize(initialState);

            const detailStyles = `body{margin:0;background:#f5f7fb;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;color:#1f2329;}
            #app{max-width:900px;margin:0 auto;padding:40px 20px 80px;}
            .article-page{background:#fff;border-radius:12px;box-shadow:0 15px 50px rgba(15,23,42,0.12);padding:40px;}
            .article-page.empty{padding:60px;text-align:center;}
            .article-header h1{font-size:2.6rem;margin:12px 0 10px;color:#0f172a;}
            .article-meta{display:flex;flex-wrap:wrap;gap:18px;font-size:0.95rem;color:#64748b;margin-bottom:20px;}
            .article-summary{background:#f1f5f9;border-left:4px solid #3b82f6;padding:16px 20px;border-radius:6px;color:#334155;line-height:1.7;}
            .back-link{font-size:0.95rem;color:#3b82f6;text-decoration:none;}
            .back-link:hover{text-decoration:underline;}
            .article-detail .content{margin-top:24px;font-size:1.08rem;line-height:1.9;color:#1e293b;}
            .article-detail .content p{margin-bottom:1.2em;}
            .article-detail .content img{max-width:100%;display:block;margin:20px auto;border-radius:8px;}
            @media (max-width:640px){#app{padding:20px;} .article-page{padding:24px;} .article-header h1{font-size:2rem;}}`;

            return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${article ? escapeHtml(article.title) : '文章详情（SSR）'}</title>
    <link rel="stylesheet" href="/admin.css">
    <style>${detailStyles}</style>
  </head>
  <body>
    <div id="app">
      ${detailHtml}
    </div>

    <script>window.__INITIAL_STATE__ = ${serialized};</script>
    <script src="/hydrate.js" defer></script>
  </body>
</html>`;
        } else {
            return `<!doctype html><html><head><meta charset="utf-8"></head><body>Unknown SSR type</body></html>`;
        }
    } catch (err) {
        console.error('[ssr/renderPage] error:', err && (err.stack || err.message || err));
        // 返回简单错误页面（不会泄露内部错误）
        return `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h1>Server Error</h1>
      <p>无法渲染页面（SSR）</p>
    </body></html>`;
    }
};
