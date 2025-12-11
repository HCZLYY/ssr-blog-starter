// client/admin.js - 后台文章管理交互（无 AI 功能）
(function () {
  const TOKEN_KEY = 'admin_token';
  const API_PREFIX = '/api/v1/articles';

  let currentPage = 1;
  let totalItems = 0;
  let pageLimit = 10;

  const dom = {
    status: () => document.getElementById('admin-status'),
    list: () => document.getElementById('admin-articles-list'),
    loadBtn: () => document.getElementById('admin-load-btn'),
    prevBtn: () => document.getElementById('admin-prev-btn'),
    nextBtn: () => document.getElementById('admin-next-btn'),
    total: () => document.getElementById('admin-total'),
    pageInfo: () => document.getElementById('admin-page-info'),
    createBtn: () => document.getElementById('admin-create-btn'),
    resetBtn: () => document.getElementById('admin-reset-btn'),
    title: () => document.getElementById('admin-title'),
    author: () => document.getElementById('admin-author'),
    summary: () => document.getElementById('admin-summary'),
    tags: () => document.getElementById('admin-tags'),
    statusSelect: () => document.getElementById('admin-status-select'),
    content: () => document.getElementById('admin-content'),
    pageInput: () => document.getElementById('admin-page'),
    perPageSelect: () => document.getElementById('admin-perpage')
  };

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch (err) { return null; }
  }

  function clearToken() {
    try { localStorage.removeItem(TOKEN_KEY); } catch (err) { }
  }

  function setStatus(text) {
    const node = dom.status();
    if (node) node.textContent = text || '';
    console.log('[admin]', text);
  }

  async function request(url, options = {}) {
    const headers = options.headers ? { ...options.headers } : {};
    if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const resp = await fetch(url, { ...options, headers, credentials: 'same-origin' });
    const text = await resp.text();
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch (err) { data = text; }
    }
    if (resp.status === 401) {
      clearToken();
      window.location.href = '/admin/login';
      throw new Error('需要重新登录');
    }
    if (!resp.ok) {
      throw new Error((data && data.error) || `请求失败 (${resp.status})`);
    }
    return data;
  }

  function escapeHtml(input) {
    if (input == null) return '';
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderList(items) {
    const container = dom.list();
    if (!container) return;
    if (!Array.isArray(items) || !items.length) {
      container.innerHTML = '<div>暂无文章</div>';
      return;
    }
    const rows = items.map(item => {
      const statusLabel = item.status === 'draft' ? '草稿' : '已发布';
      const statusClass = item.status === 'draft' ? 'status-badge status-draft' : 'status-badge';
      return `<tr>
        <td>${escapeHtml(item.id)}</td>
        <td>${escapeHtml(item.title || '')}</td>
        <td><span class="${statusClass}">${statusLabel}</span></td>
        <td>${escapeHtml(item.tags || '')}</td>
        <td>
          <button class="admin-edit-btn" data-id="${item.id}">编辑</button>
          <button class="admin-delete-btn" data-id="${item.id}">删除</button>
        </td>
      </tr>`;
    }).join('');
    container.innerHTML = `<table class="admin-table">
      <thead>
        <tr><th>ID</th><th>标题</th><th>状态</th><th>标签</th><th>操作</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
    container.querySelectorAll('.admin-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => loadArticle(btn.dataset.id));
    });
    container.querySelectorAll('.admin-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => confirmDelete(btn.dataset.id));
    });
  }

  function updatePaginationUI() {
    const totalNode = dom.total();
    if (totalNode) totalNode.textContent = String(totalItems);
    const maxPage = Math.max(1, Math.ceil(totalItems / pageLimit));
    const pageInfo = dom.pageInfo();
    if (pageInfo) pageInfo.textContent = `第 ${currentPage} / ${maxPage} 页`;
    const prevBtn = dom.prevBtn();
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    const nextBtn = dom.nextBtn();
    if (nextBtn) nextBtn.disabled = currentPage >= maxPage;
    const pageInput = dom.pageInput();
    if (pageInput) pageInput.value = currentPage;
    const perSelect = dom.perPageSelect();
    if (perSelect) perSelect.value = String(pageLimit);
  }

  async function loadList(targetPage) {
    if (typeof targetPage === 'number') {
      currentPage = Math.max(1, targetPage);
    }
    const perSelect = dom.perPageSelect();
    if (perSelect) {
      pageLimit = Number(perSelect.value || pageLimit || 10);
    }
    const loadBtn = dom.loadBtn();
    setStatus('正在加载文章…');
    if (loadBtn) loadBtn.disabled = true;
    try {
      const data = await request(`${API_PREFIX}?page=${currentPage}&limit=${pageLimit}&status=all`);
      totalItems = Number(data.total || 0);
      renderList(data.items || []);
      updatePaginationUI();
      setStatus(`已加载 ${data.total || (data.items ? data.items.length : 0)} 条记录`);
    } catch (err) {
      console.error('[admin] load list error', err);
      const container = dom.list();
      if (container) container.innerHTML = `<div style="color:#b91c1c;">加载失败：${escapeHtml(err.message || '')}</div>`;
      setStatus('加载失败');
    } finally {
      if (loadBtn) loadBtn.disabled = false;
    }
  }

  async function loadArticle(id) {
    if (!id) return;
    setStatus(`正在读取文章 ${id} …`);
    try {
      const data = await request(`${API_PREFIX}/${id}`);
      dom.title().value = data.title || '';
      dom.author().value = data.author || '';
      dom.summary().value = data.summary || '';
      dom.tags().value = data.tags || '';
      dom.statusSelect().value = data.status || 'published';
      dom.content().value = data.content || '';
      const btn = dom.createBtn();
      if (btn) {
        btn.dataset.editId = id;
        btn.textContent = '保存修改';
      }
      setStatus(`已载入文章 ${id}，修改后点击保存`);
    } catch (err) {
      console.error('[admin] load article error', err);
      setStatus('加载失败');
      alert(err.message || '加载失败');
    }
  }

  async function confirmDelete(id) {
    if (!id) return;
    if (!window.confirm(`确认删除文章 ${id} 吗？`)) return;
    setStatus(`正在删除文章 ${id} …`);
    try {
      await request(`${API_PREFIX}/${id}`, { method: 'DELETE' });
      setStatus('删除成功');
      await loadList();
    } catch (err) {
      console.error('[admin] delete error', err);
      setStatus('删除失败');
      alert(err.message || '删除失败');
    }
  }

  async function submitForm() {
    const btn = dom.createBtn();
    if (!btn) return;
    const title = (dom.title().value || '').trim();
    const author = (dom.author().value || '').trim();
    const summary = (dom.summary().value || '').trim();
    const tags = (dom.tags().value || '').trim();
    const status = dom.statusSelect().value || 'published';
    const content = (dom.content().value || '').trim();
    if (!title) { alert('请填写标题'); return; }
    if (!author) { alert('请填写作者'); return; }

    const payload = { title, author, summary, tags, status, content };
    const editId = btn.dataset.editId;
    setStatus(editId ? `正在保存文章 ${editId} …` : '正在创建文章…');
    btn.disabled = true;
    try {
      if (editId) {
        await request(`${API_PREFIX}/${editId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        await request(API_PREFIX, { method: 'POST', body: JSON.stringify(payload) });
      }
      resetForm();
      currentPage = 1;
      await loadList();
      setStatus(editId ? '修改成功' : '创建成功');
    } catch (err) {
      console.error('[admin] submit error', err);
      setStatus('提交失败');
      alert(err.message || '提交失败');
    } finally {
      btn.disabled = false;
    }
  }

  function resetForm() {
    ['title', 'author', 'summary', 'tags', 'content'].forEach(key => {
      const node = dom[key]();
      if (node) node.value = '';
    });
    const btn = dom.createBtn();
    if (btn) {
      delete btn.dataset.editId;
      btn.textContent = '新增文章';
    }
    dom.statusSelect().value = 'published';
    setStatus('表单已重置');
  }

  function bindEvents() {
    dom.loadBtn()?.addEventListener('click', () => loadList());
    dom.prevBtn()?.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage -= 1;
        loadList();
      }
    });
    dom.nextBtn()?.addEventListener('click', () => {
      const maxPage = Math.max(1, Math.ceil(totalItems / pageLimit));
      if (currentPage < maxPage) {
        currentPage += 1;
        loadList();
      }
    });
    dom.pageInput()?.addEventListener('change', () => {
      const value = Number(dom.pageInput().value || 1);
      currentPage = Math.max(1, value);
      loadList();
    });
    dom.perPageSelect()?.addEventListener('change', () => {
      pageLimit = Number(dom.perPageSelect().value || 10);
      currentPage = 1;
      loadList();
    });
    dom.createBtn()?.addEventListener('click', submitForm);
    dom.resetBtn()?.addEventListener('click', resetForm);
    loadList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindEvents);
  } else {
    bindEvents();
  }
})();
