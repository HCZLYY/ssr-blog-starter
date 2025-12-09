// client/hydrate.js
// 完整替换文件：客户端 hydration 脚本 (PowerShell / 浏览器 都通用)
// - 读取 window.__INITIAL_STATE__ 注入的初始数据
// - 激活列表页的分页、搜索（简易）和详情跳转（增强行为）
// - 激活详情页的“返回列表”按钮（若需要）
// - 采用 fetch 与后端 /api/v1/articles 接口联动
// 注意：此文件应被 express 以 static 方式提供：例如你已在 server/index.js 使用 app.use(express.static(...))

(function () {
    console.log('[hydrate] loaded');

    const initial = window.__INITIAL_STATE__ || {};
    // helper safe create element from html
    function htmlToElement(html) {
        const template = document.createElement('template');
        html = html.trim();
        template.innerHTML = html;
        return template.content.firstChild;
    }

    function renderList(items) {
        const container = document.querySelector('.server-rendered-list') || document.getElementById('list-root');
        if (!container) return;
        if (!items || items.length === 0) {
            container.innerHTML = '<p>暂无文章</p>';
            return;
        }
        container.innerHTML = items.map(a => {
            const created = a.created_at ? new Date(a.created_at).toLocaleString() : '';
            const summary = a.summary || '';
            return `<article class="article-item" data-id="${a.id}">
        <h3 class="article-title"><a href="/articles/${a.id}">${escapeHtml(a.title)}</a></h3>
        <div class="meta">作者：${escapeHtml(a.author || '')} · ${escapeHtml(created)}</div>
        <p class="summary">${escapeHtml(summary)}</p>
      </article>`;
        }).join('\n');

        // attach click handlers for links to do normal navigation (or SPA replacement)
        container.querySelectorAll('.article-title a').forEach(a => {
            a.addEventListener('click', e => {
                // allow normal navigation for SEO/demo; prevent default if you later implement client-side routing
                // e.preventDefault();
                // location.href = a.getAttribute('href');
            });
        });
    }

    function renderDetail(article) {
        const root = document.getElementById('detail-root');
        if (!root) return;
        if (!article) {
            root.innerHTML = '<p>未找到文章</p>';
            return;
        }
        root.innerHTML = `<article class="article-detail" data-id="${article.id}">
      <h1>${escapeHtml(article.title)}</h1>
      <div class="meta">作者：${escapeHtml(article.author || '')} · ${new Date(article.created_at).toLocaleString()}</div>
      <div class="content">${article.content || ''}</div>
    </article>`;
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

    async function fetchList(page = 1, limit = 10) {
        try {
            const url = `/api/v1/articles?page=${page}&limit=${limit}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Fetch list failed: ' + res.status);
            return await res.json();
        } catch (e) {
            console.error('[hydrate] fetchList error', e);
            return null;
        }
    }

    function bindPagination(page = 1, limit = 10) {
        const nav = document.getElementById('pagination-root') || document.querySelector('.pagination');
        if (!nav) return;
        const prevBtn = nav.querySelector('[data-action="prev"]');
        const nextBtn = nav.querySelector('[data-action="next"]');
        if (prevBtn) {
            prevBtn.addEventListener('click', async (e) => {
                const newPage = Math.max(1, page - 1);
                const data = await fetchList(newPage, limit);
                if (data && data.items) {
                    renderList(data.items);
                    // 更新页码显示
                    const span = nav.querySelector('span');
                    if (span) span.textContent = `第 ${newPage} 页`;
                    // rebind events for new buttons
                    bindPagination(newPage, limit);
                }
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', async (e) => {
                const newPage = page + 1;
                const data = await fetchList(newPage, limit);
                if (data && data.items) {
                    renderList(data.items);
                    const span = nav.querySelector('span');
                    if (span) span.textContent = `第 ${newPage} 页`;
                    bindPagination(newPage, limit);
                }
            });
        }
    }

    async function initList() {
        const page = (initial && initial.page) || 1;
        const limit = (initial && initial.limit) || 10;
        let items = (initial && initial.items) || null;
        if (!items) {
            const data = await fetchList(page, limit);
            if (data && data.items) items = data.items;
        }
        renderList(items || []);
        bindPagination(page, limit);
    }

    function initDetail() {
        const article = (initial && initial.article) || null;
        renderDetail(article);
    }

    // auto-detect page type
    const listRoot = document.getElementById('list-root') || document.querySelector('.server-rendered-list');
    const detailRoot = document.getElementById('detail-root');

    if (listRoot) {
        console.log('[hydrate] list page detected');
        initList();
    } else if (detailRoot) {
        console.log('[hydrate] detail page detected');
        initDetail();
    } else {
        console.log('[hydrate] no known root found, nothing to hydrate');
    }
})();
