/* client/admin.js - enhanced version
   替换整个文件
*/
(function () {
    const ids = {
        loadBtn: 'admin-load-btn',
        createBtn: 'admin-create-btn',
        resetBtn: 'admin-reset-btn',
        title: 'admin-title',
        author: 'admin-author',
        summary: 'admin-summary',
        content: 'admin-content',
        listContainer: 'admin-articles-list',
        status: 'admin-status',
        perPage: 'admin-perpage',
        page: 'admin-page'
    };

    function el(id) { return document.getElementById(id); }
    function setStatus(msg) { const s = el(ids.status); if (s) s.textContent = msg; console.log('[admin] status:', msg); }

    async function api(path, opts = {}) {
        const headers = opts.headers || {};
        if (!headers['Content-Type'] && !(opts.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }
        const token = localStorage.getItem('admin_token');
        if (token) headers['Authorization'] = 'Bearer ' + token;

        console.log('[admin] API call', opts.method || 'GET', path, opts.body ? (typeof opts.body === 'string' ? opts.body : opts.body) : '');
        const res = await fetch(path, { ...opts, headers, credentials: 'same-origin' });
        const text = await res.text();
        // try parse json when possible
        let parsed;
        try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
        if (!res.ok) {
            const err = new Error(`HTTP ${res.status} ${res.statusText}`);
            err.status = res.status;
            err.body = parsed;
            err.rawText = text;
            console.error('[admin] API error response', { status: res.status, body: parsed, text });
            throw err;
        }
        return parsed;
    }

    // render list
    function renderList(data) {
        console.log('[admin] renderList data:', data);
        const lc = el(ids.listContainer);
        if (!lc) { console.warn('[admin] missing list container'); return; }
        const items = Array.isArray(data.items) ? data.items : (Array.isArray(data) ? data : []);
        if (!items.length) {
            lc.innerHTML = '<div>暂无文章</div>';
            return;
        }
        let html = `<table class="admin-table"><thead><tr><th>ID</th><th>标题</th><th>作者</th><th>操作</th></tr></thead><tbody>`;
        for (const it of items) {
            html += `<tr>
        <td>${escapeHtml(String(it.id || ''))}</td>
        <td>${escapeHtml(it.title || '')}</td>
        <td>${escapeHtml(it.author || '')}</td>
        <td>
          <button data-id="${it.id}" class="admin-edit-btn">编辑</button>
          <button data-id="${it.id}" class="admin-delete-btn">删除</button>
        </td>
      </tr>`;
        }
        html += '</tbody></table>';
        lc.innerHTML = html;

        Array.from(lc.querySelectorAll('.admin-edit-btn')).forEach(b => {
            b.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                editArticle(id);
            };
        });
        Array.from(lc.querySelectorAll('.admin-delete-btn')).forEach(b => {
            b.onclick = (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if (confirm(`确定要删除文章 id=${id} 吗？`)) deleteArticle(id);
            };
        });
    }

    function escapeHtml(s) {
        if (!s && s !== 0) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    async function loadList() {
        const page = Number(el(ids.page).value || 1);
        const limit = Number(el(ids.perPage).value || 10);
        setStatus('加载文章中…');
        const loadBtn = el(ids.loadBtn);
        if (loadBtn) loadBtn.disabled = true;
        try {
            const data = await api(`/api/v1/articles?page=${page}&limit=${limit}`, { method: 'GET' });
            renderList(data);
            setStatus(`已加载 ${data.total ?? data.items.length} 条`);
            return data;
        } catch (err) {
            console.error('[admin] load error', err);
            setStatus('加载文章失败：' + (err.body || err.message));
            const lc = el(ids.listContainer);
            if (lc) lc.innerHTML = `<div style="color:#900">加载文章失败：${escapeHtml(String(err.body || err.message || err.rawText))}</div>`;
            throw err;
        } finally {
            if (loadBtn) loadBtn.disabled = false;
        }
    }

    async function editArticle(id) {
        setStatus(`加载文章 ${id} 中…`);
        try {
            const data = await api(`/api/v1/articles/${id}`, { method: 'GET' });
            el(ids.title).value = data.title || '';
            el(ids.author).value = data.author || '';
            el(ids.summary).value = data.summary || '';
            el(ids.content).value = data.content || '';
            const btn = el(ids.createBtn);
            btn.textContent = '保存修改';
            btn._editId = id;
            setStatus(`已加载文章 ${id}，编辑后点击“保存修改”`);
        } catch (err) {
            console.error('[admin] edit load error', err);
            setStatus('加载文章失败：' + (err.body || err.message));
            alert('加载文章失败：' + (JSON.stringify(err.body) || err.message));
        }
    }

    async function deleteArticle(id) {
        setStatus(`删除文章 ${id}…`);
        const btn = document.querySelector(`[data-id="${id}"]`);
        try {
            const res = await api(`/api/v1/articles/${id}`, { method: 'DELETE' });
            console.log('[admin] delete response', res);
            setStatus(`删除成功 id=${id}`);
            // reload list (ensure first page so it appears)
            await loadList();
        } catch (err) {
            console.error('[admin] delete error', err);
            setStatus('删除失败：' + (err.body || err.message));
            alert('删除失败：' + (JSON.stringify(err.body) || err.message || err.rawText));
        } finally {
            if (btn) btn.disabled = false;
        }
    }

    async function createOrUpdate() {
        const btn = el(ids.createBtn);
        if (!btn) return;
        if (btn.disabled) return;
        const title = (el(ids.title).value || '').trim();
        const author = (el(ids.author).value || '').trim();
        const summary = (el(ids.summary).value || '').trim();
        const content = (el(ids.content).value || '').trim();

        if (!title) { alert('请填写标题'); return; }
        if (!author) { alert('请填写作者'); return; }

        const payload = { title, author, summary, content };

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = '处理中…';
        try {
            if (btn._editId) {
                const id = btn._editId;
                const res = await api(`/api/v1/articles/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                console.log('[admin] update result', res);
                setStatus(`更新成功 id=${id}`);
                delete btn._editId;
                btn.textContent = '新增文章';
            } else {
                const res = await api(`/api/v1/articles`, {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                console.log('[admin] create result', res);
                setStatus(`新增成功 id=${res.id || '(unknown)'}`);
            }
            resetForm();
            // 强制刷新列表并确保第一页（新建通常放第一页）
            el(ids.page).value = 1;
            // small delay to let backend commit (极少数情况可见)
            await new Promise(r => setTimeout(r, 150));
            await loadList();
        } catch (err) {
            console.error('[admin] create/update error', err);
            setStatus('提交失败：' + (err.body || err.message));
            alert('提交失败：' + (JSON.stringify(err.body) || err.message || err.rawText));
            if (btn._editId) btn.textContent = '保存修改';
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    function resetForm() {
        if (el(ids.title)) el(ids.title).value = '';
        if (el(ids.author)) el(ids.author).value = '';
        if (el(ids.summary)) el(ids.summary).value = '';
        if (el(ids.content)) el(ids.content).value = '';
        const btn = el(ids.createBtn);
        if (btn) { delete btn._editId; btn.textContent = '新增文章'; btn.disabled = false; }
        setStatus('表单已重置');
    }

    function bindUI() {
        const loadBtn = el(ids.loadBtn);
        const createBtn = el(ids.createBtn);
        const resetBtn = el(ids.resetBtn);

        if (!loadBtn) console.warn('[admin] load button not found'); else loadBtn.onclick = loadList;
        if (!createBtn) console.warn('[admin] create button not found'); else createBtn.onclick = createOrUpdate;
        if (!resetBtn) console.warn('[admin] reset button not found'); else resetBtn.onclick = resetForm;

        const perEl = el(ids.perPage);
        if (perEl) perEl.onchange = () => el(ids.page).value = 1;

        loadList().catch(e => console.warn('[admin] initial load failed', e));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindUI);
    } else {
        bindUI();
    }
})();
