// server/ssr/renderPage.js
// SSR list/detail renderer with degrade + redis cache

const db = require('../lib/db');
let redisClient = null;
try {
  redisClient = require('../lib/redis');
} catch (e) {
  redisClient = null;
}

function safeSerialize(obj) {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}

function formatTags(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeoutErr = new Error(`timeout:${label}`);
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(timeoutErr), ms);
    })
  ]).finally(() => clearTimeout(timer));
}

function renderTagBadges(tagsValue) {
  const tags = formatTags(tagsValue);
  if (!tags.length) return '';
  return `<ul class="article-tags">${tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`;
}

function renderTagFilterHtml(availableTags = []) {
  const tags = Array.isArray(availableTags) ? availableTags : [];
  const buttons = [''].concat(tags).map(tag => {
    const label = tag || '全部';
    const activeClass = tag === '' ? ' active' : '';
    return `<button class="tag-filter-btn${activeClass}" data-tag="${escapeHtml(tag)}">${escapeHtml(label)}</button>`;
  });
  return `<div class="tag-filter" id="tag-filter-root">${buttons.join('')}</div>`;
}

function renderTagDrawerSection(availableTags = []) {
  return `<div class="tag-drawer" id="tag-drawer">
      <button class="tag-drawer-toggle" id="tag-drawer-open" type="button">
        打开标签筛选
      </button>
      <div class="tag-drawer-panel" id="tag-drawer-panel" aria-hidden="true">
        <div class="tag-drawer-header">
          <div>
            <p class="tag-drawer-kicker">标签筛选</p>
            <h3>挑选你关心的主题</h3>
          </div>
          <button class="tag-drawer-close" id="tag-drawer-close" type="button" aria-label="关闭标签抽屉">×</button>
        </div>
        <div class="tag-drawer-body">
          ${renderTagFilterHtml(availableTags)}
        </div>
      </div>
      <div class="tag-drawer-mask hidden" id="tag-drawer-mask" role="presentation"></div>
    </div>`;
}

function renderEmptyState() {
  return `<div class="empty-state" id="list-empty-state">
      <div class="empty-icon">🛰️</div>
      <h3>暂无文章</h3>
      <p>去后台创建一篇科技与数码专题文章。</p>
      <a class="ghost-btn" href="/admin/articles" target="_blank" rel="noopener">打开管理后台</a>
    </div>`;
}

function renderArticleCard(article) {
  const created = article.created_at ? new Date(article.created_at).toLocaleDateString() : '';
  const summary = article.summary || '暂无摘要信息。';
  const tagsHtml = renderTagBadges(article.tags);
  return `<a class="article-card" data-id="${article.id}" href="/articles/${article.id}">
      <div class="card-head">
        <span class="card-author">${escapeHtml(article.author || '匿名作者')}</span>
        ${created ? `<span class="card-date">${escapeHtml(created)}</span>` : ''}
      </div>
      <h3 class="card-title">${escapeHtml(article.title)}</h3>
      <p class="card-summary">${escapeHtml(summary)}</p>
      ${tagsHtml}
      <div class="card-footer">
        <span class="card-link">阅读全文 <span aria-hidden="true">→</span></span>
      </div>
    </a>`;
}

function renderListHtml(items = [], page = 1, limit = 10, availableTags = [], options = {}) {
  const degraded = !!options.degraded;
  const total = Number(options.total || (items ? items.length : 0));
  const searchValue = options.search ? escapeHtml(options.search) : '';
  const heroSection = `
    <section class="list-hero">
      <div class="hero-text">
        <p class="hero-kicker">科技与数码专题 · SSR 博客</p>
        <h1>科技与数码：重塑生活的力量</h1>
        <p class="hero-subtitle">聚焦手机摄影、智能家居、远程办公等实用技巧，让您的生活更加便利。</p>
        <div class="hero-meta">
          <div class="meta-item">
            <span class="meta-value" id="list-meta-total">${total}</span>
            <span class="meta-label">篇精选文章</span>
          </div>
          <div class="meta-item">
            <span class="meta-value">SSR</span>
            <span class="meta-label">极速首屏</span>
          </div>
          <div class="meta-item">
            <span class="meta-value">${limit}</span>
            <span class="meta-label">每页文章</span>
          </div>
        </div>
      </div>
      <div class="hero-actions">
        <button id="hero-refresh-btn" type="button">刷新文章</button>
        <a class="hero-link" href="/admin/login" target="_blank" rel="noopener">进入管理后台</a>
      </div>
    </section>`;

  const degradeNotice = `
    <section id="degrade-banner" class="degrade-banner${degraded ? '' : ' hidden'}">
      <div class="banner-text">
        <strong>当前处于降级模式</strong>
        <p id="degrade-banner-message">${degraded ? '服务端暂不可用，已切换至缓存/骨架界面，请稍后刷新重试。' : ''}</p>
      </div>
      <button id="retry-fetch-btn" type="button">刷新重试</button>
    </section>`;

  const cards = (items || []).map(renderArticleCard).join('\n');
  const listBody = cards || renderEmptyState();

  return `<div id="list-root" class="${degraded ? 'state-degraded' : ''}">
    ${heroSection}
    ${degradeNotice}
    <section class="list-controls">
      <div class="controls-head">
        <div>
          <p class="controls-label">浏览与筛选</p>
          <h2>找到你想要的内容</h2>
        </div>
        <p class="controls-tip">第${page}页 · 每页${limit}篇</p>
      </div>
      <div class="list-search" id="list-search-bar">
        <label class="sr-only" for="article-search-input">搜索文章</label>
        <input type="search" id="article-search-input" placeholder="输入标题、摘要或正文关键字" value="${searchValue}">
        <div class="list-search-actions">
          <button type="button" id="article-search-btn">搜索</button>
          <button type="button" id="article-search-clear" class="ghost-btn">清空</button>
        </div>
      </div>
      ${renderTagDrawerSection(availableTags)}
    </section>
    <section class="list-results">
      <div class="loading-indicator hidden" id="list-loading-indicator">
        <span class="spinner" aria-hidden="true"></span>
        <em>正在同步文章，请稍候…</em>
      </div>
      <div class="article-collection" id="articles-container">
        ${listBody}
      </div>
      <nav class="pagination" id="pagination-root">
        <button data-action="prev">上一页</button>
        <span>第${page}页</span>
        <button data-action="next">下一页</button>
      </nav>
    </section>
  </div>`;
}

function renderDetailHtml(article) {
  if (!article) {
    return `<div id="detail-root" class="article-page empty"><p>未找到文章或已被删除</p><a class="back-link" href="/">←返回文章列表</a></div>`;
  }
  const created = article.created_at ? new Date(article.created_at).toLocaleString() : '';
  const summary = article.summary ? `<p class="article-summary">${escapeHtml(article.summary)}</p>` : '';
  return `<div id="detail-root" class="article-page">
    <header class="article-header">
      <a class="back-link" href="/">←返回文章列表</a>
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

function renderDegradedDetailPlaceholder(id) {
  const safeId = Number(id) || '';
  return `<div id="detail-root" class="article-page empty" data-id="${safeId}">
    <div class="degrade-panel">
      <p id="detail-retry-message">服务器暂时无法读取文章内容，已切换为降级模式。</p>
      <button id="detail-retry-btn" type="button">刷新重试</button>
    </div>
    <a class="back-link" href="/">←返回文章列表</a>
  </div>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchListFromDb(page = 1, limit = 10) {
  const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
  const countSql = `SELECT COUNT(*) AS total FROM articles WHERE deleted = 0 AND status = 'published'`;
  const listSql = `
        SELECT id, title, summary, author, created_at, tags
        FROM articles
        WHERE deleted = 0 AND status = 'published'
        ORDER BY id DESC
        LIMIT ?, ?
    `;
  const [countRows] = await db.query(countSql);
  const total = countRows && countRows[0] ? Number(countRows[0].total || 0) : 0;
  const [rows] = await db.query(listSql, [offset, Number(limit)]);
  return { items: rows || [], total };
}

async function fetchAvailableTags() {
  const sql = `SELECT tags FROM articles WHERE deleted = 0 AND status = 'published' AND tags IS NOT NULL`;
  const [rows] = await db.query(sql);
  const tagSet = new Set();
  (rows || []).forEach(row => {
    formatTags(row.tags).forEach(tag => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

async function fetchDetailFromDb(id) {
  const sql = `
        SELECT id, title, content, summary, author, created_at, tags
        FROM articles
        WHERE id = ? AND deleted = 0 AND status = 'published'
        LIMIT 1
    `;
  const [rows] = await db.query(sql, [Number(id)]);
  return (rows && rows[0]) || null;
}

module.exports = async function renderPage(type, data = {}) {
  try {
    if (type === 'list') {
      const page = Number(data.page || 1);
      const limit = Number(data.limit || 10);
      const searchValue = typeof data.search === 'string' ? data.search : '';
      const cacheKey = `ssr:list:page:${page}:limit:${limit}`;

      let cachedPayload = null;
      if (redisClient && typeof redisClient.get === 'function') {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) cachedPayload = JSON.parse(cached);
        } catch (e) { /* ignore */ }
      }

      let items = cachedPayload && Array.isArray(cachedPayload.items) ? cachedPayload.items : null;
      let total = cachedPayload && typeof cachedPayload.total !== 'undefined'
        ? Number(cachedPayload.total)
        : (items ? items.length : 0);
      let degraded = false;

      if (!cachedPayload) {
        try {
          const result = await withTimeout(fetchListFromDb(page, limit), 2000, 'list-query');
          items = Array.isArray(result.items) ? result.items : [];
          total = Number(result.total || items.length || 0);
          if (redisClient && typeof redisClient.set === 'function') {
            redisClient.set(cacheKey, JSON.stringify({ items, total }), 30).catch(() => { });
          }
        } catch (err) {
          degraded = true;
          console.error('[ssr/renderPage] list data error:', err && err.message);
          items = [];
          total = 0;
        }
      }

      let availableTags = [];
      if (!degraded) {
        try {
          availableTags = await withTimeout(fetchAvailableTags(), 2000, 'list-tags');
        } catch (err) {
          degraded = true;
          console.error('[ssr/renderPage] tag fetch error:', err && err.message);
        }
      }

      const initialState = { page, limit, items, availableTags, degraded, total, search: searchValue };
      const listHtml = renderListHtml(items, page, limit, availableTags, { degraded, total, search: searchValue });
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
      ${listHtml}
    </div>
    <script>window.__INITIAL_STATE__ = ${serialized};</script>
    <script src="/hydrate.js" defer></script>
  </body>
</html>`;
    } else if (type === 'detail') {
      const id = Number(data.id);
      const cacheKey = `article:${id}`;

      let article = null;
      if (redisClient && typeof redisClient.get === 'function') {
        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) article = JSON.parse(cached);
        } catch (e) { article = null; }
      }

      let degradedDetail = false;
      if (!article) {
        try {
          article = await withTimeout(fetchDetailFromDb(id), 2000, 'detail-query');
          if (article && redisClient && typeof redisClient.set === 'function') {
            redisClient.set(cacheKey, JSON.stringify(article), 60).catch(() => { });
          }
        } catch (err) {
          degradedDetail = true;
          console.error('[ssr/renderPage] detail data error:', err && err.message);
          article = null;
        }
      }

      const initialState = { article, degraded: degradedDetail, id };
      const detailHtml = degradedDetail ? renderDegradedDetailPlaceholder(id) : renderDetailHtml(article);
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
            .degrade-panel{background:#fef9c3;border:1px solid #facc15;color:#854d0e;padding:18px;border-radius:10px;margin-bottom:20px;text-align:center;}
            .degrade-panel button{background:#f97316;color:#fff;border:none;border-radius:6px;padding:8px 18px;font-size:1rem;cursor:pointer;}
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
    }

    return `<!doctype html><html><head><meta charset="utf-8"></head><body>Unknown SSR type</body></html>`;
  } catch (err) {
    console.error('[ssr/renderPage] error:', err && (err.stack || err.message || err));
    return `<!doctype html><html><head><meta charset="utf-8"></head><body>
      <h1>Server Error</h1>
      <p>无法渲染页面（SSR）</p>
    </body></html>`;
  }
};
