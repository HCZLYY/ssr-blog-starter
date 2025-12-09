// web/pages/index.js
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home({ ssrArticles = [], ssrDegraded = false }) {
    const [articles, setArticles] = useState(ssrArticles);
    const [degraded, setDegraded] = useState(ssrDegraded);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (degraded && articles.length === 0) {
            // try client fetch to recover
            (async () => {
                setLoading(true);
                try {
                    const r = await fetch(`/api/v1/articles?page=1&limit=10`);
                    if (r.ok) {
                        const data = await r.json();
                        if (data && data.value) setArticles(data.value);
                        setDegraded(false);
                    }
                } catch (e) {
                    // still degraded
                } finally {
                    setLoading(false);
                }
            })();
        }
    }, [degraded, articles.length]);

    return (
        <div style={{ padding: 24 }}>
            <h1>文章列表</h1>
            {degraded && <div style={{ color: 'orange' }}>服务器负载/数据不可用，已降级 — 正在尝试恢复...</div>}
            {loading && <div>加载中...</div>}
            <ul>
                {articles.length === 0 ? (
                    <li>暂无文章</li>
                ) : (
                    articles.map(a => (
                        <li key={a.id} style={{ marginBottom: 12 }}>
                            <h3><Link href={`/articles/${a.id}`} legacyBehavior><a>{a.title}</a></Link></h3>
                            <p>{a.summary}</p>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
}

export async function getServerSideProps(ctx) {
    const API = process.env.API_BASE || 'http://localhost:3000';
    try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(`${API}/api/v1/articles?page=1&limit=10`, { signal: controller.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error('api not ok');
        const data = await res.json();
        return { props: { ssrArticles: data.value || [], ssrDegraded: !!data.degraded } };
    } catch (e) {
        // return skeleton (降级)
        return { props: { ssrArticles: [], ssrDegraded: true } };
    }
}
