import { useEffect, useState } from 'react';

export default function Admin() {
    const [articles, setArticles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({ id: null, title: '', summary: '', content: '', status: 'published' });
    const [editing, setEditing] = useState(false);
    const [err, setErr] = useState('');
    const [msg, setMsg] = useState('');

    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3000';

    useEffect(() => { fetchList(); }, []);

    async function fetchList() {
        setLoading(true);
        setErr('');
        try {
            const res = await fetch(`${API_BASE}/api/v1/articles?page=1&limit=50`);
            const j = await res.json();
            setArticles(j.items || []);
        } catch (e) {
            console.error('fetch list err', e);
            setErr('无法获取文章列表');
        } finally { setLoading(false); }
    }

    function handleChange(e) {
        const { name, value } = e.target;
        setForm(s => ({ ...s, [name]: value }));
    }

    function startEdit(a) {
        setForm({ id: a.id, title: a.title || '', summary: a.summary || '', content: a.content || '', status: 'published' });
        setEditing(true);
    }

    function resetForm() {
        setForm({ id: null, title: '', summary: '', content: '', status: 'published' });
        setEditing(false);
    }

    async function submitForm(e) {
        e.preventDefault();
        setErr(''); setMsg('');
        try {
            const payload = { title: form.title, summary: form.summary, content: form.content };
            let res;
            if (form.id) {
                res = await fetch(`${API_BASE}/api/v1/articles/${form.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } else {
                res = await fetch(`${API_BASE}/api/v1/articles`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            }
            if (!res.ok) throw new Error('服务器错误');
            await fetchList();
            resetForm();
            setMsg('操作成功');
        } catch (e) {
            console.error(e);
            setErr('提交失败');
        }
    }

    async function handleDelete(id) {
        if (!confirm('确定删除这篇文章？')) return;
        try {
            const res = await fetch(`${API_BASE}/api/v1/articles/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('删除失败');
            await fetchList();
            setMsg('删除成功');
        } catch (e) {
            console.error(e);
            setErr('删除失败');
        }
    }

    return (
        <div style={{ padding: 24 }}>
            <h1>后台文章管理</h1>

            <section style={{ marginBottom: 20 }}>
                <h2>{editing ? '编辑文章' : '新建文章'}</h2>
                <form onSubmit={submitForm}>
                    <input name="title" value={form.title} onChange={handleChange} placeholder="标题" style={{ width: '60%', marginBottom: 8 }} />
                    <input name="summary" value={form.summary} onChange={handleChange} placeholder="摘要" style={{ width: '80%', marginBottom: 8 }} />
                    <textarea name="content" value={form.content} onChange={handleChange} placeholder="正文" rows={6} style={{ width: '90%', marginBottom: 8 }} />
                    <div>
                        <button type="submit">{editing ? '保存修改' : '发布文章'}</button>
                        <button type="button" onClick={resetForm} style={{ marginLeft: 10 }}>重置</button>
                    </div>
                </form>
            </section>

            <section>
                <h2>文章列表</h2>
                {loading ? <div>加载中…</div> : (
                    <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                            <tr><th>ID</th><th>标题</th><th>摘要</th><th>操作</th></tr>
                        </thead>
                        <tbody>
                            {articles.map(a => (
                                <tr key={a.id}>
                                    <td>{a.id}</td>
                                    <td>{a.title}</td>
                                    <td>{a.summary}</td>
                                    <td>
                                        <button onClick={() => startEdit(a)}>编辑</button>
                                        <button onClick={() => handleDelete(a.id)} style={{ marginLeft: 8 }}>删除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </section>

            {msg && <div style={{ color: 'green', marginTop: 12 }}>{msg}</div>}
            {err && <div style={{ color: 'red', marginTop: 12 }}>{err}</div>}
        </div>
    );
}
