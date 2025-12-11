// client/hydrate.js
// client side hydration for list/detail interactions

(function () {
    console.log('[hydrate] loaded');

    const initial = window.__INITIAL_STATE__ || {};
    const pageLimit = Number(initial.limit || 10);
    let currentPage = Number(initial.page || 1);
    let currentTag = initial.tag || '';
    let currentQuery = typeof initial.search === 'string' ? initial.search.trim() : '';
    let availableTags = Array.isArray(initial.availableTags) ? initial.availableTags : [];
    let totalCount = Number(initial.total || (Array.isArray(initial.items) ? initial.items.length : 0));
    let isListDegraded = !!initial.degraded;
    let detailDegraded = !!initial.degraded;
    const detailArticleId = Number(initial.id || (initial.article && initial.article.id) || 0);
    let tagDrawerPanel = null;
    let tagDrawerMask = null;

    const emptyStateHtml = `
        <div class="empty-state" id="list-empty-state">
            <h3>暂无文章</h3>
            <p>去后台创建一篇相关文章。</p>
            <a class="ghost-btn" href="/admin/articles" target="_blank" rel="noopener">打开管理后台</a>
        </div>`;

    function escapeHtml(value) {
        if (value == null) return '';
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function formatTags(value) {
        if (!value) return [];
        return String(value)
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
    }

    function buildArticleCard(article) {
        const created = article.created_at ? new Date(article.created_at).toLocaleDateString() : '';
        const summary = article.summary || '暂无摘要信息。';
        const tags = formatTags(article.tags);
        const tagsHtml = tags.length
            ? `<ul class="article-tags">${tags.map(tag => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>`
            : '';
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

    function renderList(items = []) {
        const container = document.getElementById('articles-container');
        if (!container) return;
        if (!Array.isArray(items) || !items.length) {
            container.innerHTML = emptyStateHtml;
        } else {
            container.innerHTML = items.map(buildArticleCard).join('\n');
        }
        toggleDegradeBanner(isListDegraded);
    }

    function renderTagFilters(tags = [], activeTag = '') {
        const container = document.getElementById('tag-filter-root');
        if (!container) return;
        const unique = [''].concat(Array.from(new Set(tags)));
        container.innerHTML = unique.map(tag => {
            const label = tag || '全部';
            const active = tag === (activeTag || '') ? ' active' : '';
            return `<button class="tag-filter-btn${active}" data-tag="${escapeHtml(tag)}">${escapeHtml(label)}</button>`;
        }).join('');
    }

    function toggleDegradeBanner(active, message) {
        const banner = document.getElementById('degrade-banner');
        const root = document.getElementById('list-root');
        if (!banner) return;
        const text = document.getElementById('degrade-banner-message');
        if (active) {
            banner.classList.remove('hidden');
            if (text && message) text.textContent = message;
        } else {
            banner.classList.add('hidden');
        }
        if (root) root.classList.toggle('state-degraded', !!active);
    }

    function bindDegradeControls() {
        const btn = document.getElementById('retry-fetch-btn');
        if (!btn || btn.__bound) return;
        btn.__bound = true;
        btn.addEventListener('click', () => {
            toggleDegradeBanner(true, '正在重新加载，请稍候…');
            updateList(currentPage, currentTag, currentQuery);
        });
    }

    function toggleTagDrawer(open) {
        if (!tagDrawerPanel) tagDrawerPanel = document.getElementById('tag-drawer-panel');
        if (!tagDrawerMask) tagDrawerMask = document.getElementById('tag-drawer-mask');
        if (!tagDrawerPanel) return;
        tagDrawerPanel.classList.toggle('open', !!open);
        if (tagDrawerMask) tagDrawerMask.classList.toggle('hidden', !open);
        document.body.classList.toggle('drawer-open', !!open);
    }

    function closeTagDrawer() {
        toggleTagDrawer(false);
    }

    function bindTagDrawer() {
        tagDrawerPanel = document.getElementById('tag-drawer-panel');
        tagDrawerMask = document.getElementById('tag-drawer-mask');
        const openBtn = document.getElementById('tag-drawer-open');
        const closeBtn = document.getElementById('tag-drawer-close');
        if (!tagDrawerPanel || !openBtn || tagDrawerPanel.__bound) return;
        openBtn.addEventListener('click', () => toggleTagDrawer(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleTagDrawer(false));
        if (tagDrawerMask) {
            tagDrawerMask.addEventListener('click', () => toggleTagDrawer(false));
        }
        tagDrawerPanel.__bound = true;
    }

    function renderDetail(article) {
        const root = document.getElementById('detail-root');
        if (!root) return;
        if (!article) {
            if (detailDegraded) {
                root.dataset.id = detailArticleId || root.dataset.id || '';
                root.innerHTML = `
        <div class="degrade-panel">
          <p id="detail-retry-message">服务器暂时无法获取内容，您可以稍后刷新或点击下方按钮重试。</p>
          <button id="detail-retry-btn" type="button">刷新重试</button>
        </div>
        <a class="back-link" href="/">←返回文章列表</a>`;
                bindDetailRetry();
            } else {
                root.innerHTML = '<p>未找到文章或已被删除</p><a class="back-link" href="/">←返回文章列表</a>';
            }
            return;
        }
        detailDegraded = false;
        root.dataset.id = article.id || '';
        root.innerHTML = `<article class="article-detail" data-id="${article.id}">
      <h1>${escapeHtml(article.title)}</h1>
      <div class="meta">作者：${escapeHtml(article.author || '')} · ${new Date(article.created_at).toLocaleString()}</div>
      <div class="content">${article.content || ''}</div>
    </article>`;
    }

    function bindDetailRetry() {
        const btn = document.getElementById('detail-retry-btn');
        if (!btn || btn.__bound || !detailArticleId) return;
        btn.__bound = true;
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '重试中…';
            const data = await fetchDetailData(detailArticleId);
            if (data) {
                renderDetail(data);
            } else {
                detailDegraded = true;
                const msg = document.getElementById('detail-retry-message');
                if (msg) msg.textContent = '仍然无法取得数据，请稍后再试。';
                btn.disabled = false;
                btn.textContent = '刷新重试';
            }
        });
    }

    async function fetchList(page = 1, limit = 10, tag = '', search = '') {
        try {
            const params = new URLSearchParams({ page: String(page), limit: String(limit) });
            if (tag) params.append('tag', tag);
            if (search) params.append('search', search);
            const res = await fetch(`/api/v1/articles?${params.toString()}`);
            if (!res.ok) throw new Error('Fetch list failed: ' + res.status);
            return await res.json();
        } catch (e) {
            console.error('[hydrate] fetchList error', e);
            return null;
        }
    }

    async function fetchDetailData(id) {
        if (!id) return null;
        try {
            const res = await fetch(`/api/v1/articles/${id}`);
            if (!res.ok) throw new Error('Fetch detail failed: ' + res.status);
            return await res.json();
        } catch (e) {
            console.error('[hydrate] fetchDetail error', e);
            return null;
        }
    }

    function setLoading(active) {
        const indicator = document.getElementById('list-loading-indicator');
        const root = document.getElementById('list-root');
        if (indicator) indicator.classList.toggle('hidden', !active);
        if (root) root.classList.toggle('is-loading', !!active);
    }

    function updateTotalCount(total) {
        totalCount = Number(total || 0);
        const totalEl = document.getElementById('list-meta-total');
        if (totalEl) totalEl.textContent = totalCount;
    }

    function syncSearchInputValue(value) {
        const input = document.getElementById('article-search-input');
        if (input) input.value = value || '';
    }

    async function updateList(page, tag = currentTag, search = currentQuery) {
        setLoading(true);
        try {
            const data = await fetchList(page, pageLimit, tag, search);
            if (!data || !Array.isArray(data.items)) throw new Error('invalid list payload');
            currentPage = page;
            currentTag = data.tag || tag || '';
            currentQuery = typeof data.search === 'string' ? data.search : search || '';
            availableTags = Array.isArray(data.availableTags) ? data.availableTags : availableTags;
            isListDegraded = !!data.degraded;
            updateTotalCount(data.total);
            renderList(data.items);
            renderTagFilters(availableTags, currentTag);
            bindPagination(currentPage, pageLimit);
            syncSearchInputValue(currentQuery);
            toggleDegradeBanner(isListDegraded, isListDegraded ? '已切换至降级模式，请稍后重试。' : '');
            return true;
        } catch (err) {
            console.error('[hydrate] updateList error', err);
            isListDegraded = true;
            toggleDegradeBanner(true, '加载失败，请稍后再试或点击按钮重试。');
            return false;
        } finally {
            setLoading(false);
        }
    }

    function bindTagFilters() {
        const container = document.getElementById('tag-filter-root');
        if (!container || container.__tagBound) return;
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-tag]');
            if (!btn) return;
            const tag = btn.getAttribute('data-tag') || '';
            if (tag === currentTag) return;
            await updateList(1, tag, currentQuery);
            closeTagDrawer();
        });
        container.__tagBound = true;
    }

    function bindPagination(page = currentPage, limit = pageLimit) {
        const nav = document.getElementById('pagination-root');
        if (!nav) return;
        const span = nav.querySelector('span');
        if (span) span.textContent = `第${page}页`;
        const prevBtn = nav.querySelector('[data-action="prev"]');
        const nextBtn = nav.querySelector('[data-action="next"]');
        if (prevBtn) {
            prevBtn.onclick = async () => {
                const target = Math.max(1, page - 1);
                if (target === page) return;
                await updateList(target, currentTag, currentQuery);
            };
        }
        if (nextBtn) {
            nextBtn.onclick = async () => {
                const target = page + 1;
                await updateList(target, currentTag, currentQuery);
            };
        }
    }

    function bindHeroRefresh() {
        const btn = document.getElementById('hero-refresh-btn');
        if (!btn || btn.__bound) return;
        btn.__bound = true;
        btn.addEventListener('click', () => updateList(1, currentTag, currentQuery));
    }

    function bindSearchBar() {
        const wrapper = document.getElementById('list-search-bar');
        const input = document.getElementById('article-search-input');
        const searchBtn = document.getElementById('article-search-btn');
        const clearBtn = document.getElementById('article-search-clear');
        if (!wrapper || wrapper.__bound) {
            if (input) input.value = currentQuery;
            return;
        }
        if (input) input.value = currentQuery;

        const triggerSearch = async () => {
            if (!input) return;
            currentQuery = input.value.trim();
            await updateList(1, currentTag, currentQuery);
        };

        if (searchBtn) {
            searchBtn.addEventListener('click', triggerSearch);
        }
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    triggerSearch();
                }
            });
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', async () => {
                if (!input) return;
                if (!input.value && !currentQuery) return;
                input.value = '';
                currentQuery = '';
                await updateList(1, currentTag, '');
            });
        }
        wrapper.__bound = true;
    }

    async function initList() {
        let items = initial.items || null;
        if (!items) {
            const data = await fetchList(currentPage, pageLimit, currentTag, currentQuery);
            if (data && data.items) {
                items = data.items;
                availableTags = Array.isArray(data.availableTags) ? data.availableTags : availableTags;
                currentTag = data.tag || currentTag;
                currentQuery = typeof data.search === 'string' ? data.search : currentQuery;
                isListDegraded = !!data.degraded;
                totalCount = Number(data.total || totalCount);
            }
        }
        renderList(items || []);
        updateTotalCount(totalCount);
        renderTagFilters(availableTags, currentTag);
        bindPagination(currentPage, pageLimit);
        syncSearchInputValue(currentQuery);
        bindTagDrawer();
        bindTagFilters();
        bindSearchBar();
        bindDegradeControls();
        bindHeroRefresh();
        if (isListDegraded) {
            toggleDegradeBanner(true, '服务端暂不可用，已切换至降级模式。');
        }
    }

    function initDetail() {
        const article = initial.article || null;
        renderDetail(article);
        if (detailDegraded && detailArticleId) {
            bindDetailRetry();
        }
    }

    const listRoot = document.getElementById('list-root');
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
