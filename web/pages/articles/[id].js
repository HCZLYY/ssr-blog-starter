import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

export default function ArticlePage() {
    const router = useRouter();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!router.query.id) return;
        (async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/v1/articles/${router.query.id}`);
                if (!res.ok) throw new Error('文章未找到');
                const data = await res.json();
                setArticle(data);
            } catch (e) {
                console.error(e);
                setArticle(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [router.query.id]);

    const metaInfo = useMemo(() => {
        if (!article) return { author: '佚名', date: '刚刚' };
        return {
            author: article.author || '佚名',
            date: article.created_at ? new Date(article.created_at).toLocaleString() : '刚刚'
        };
    }, [article]);

    if (loading) return <div className="article-page loading">加载中…</div>;
    if (!article) return <div className="article-page empty">文章未找到</div>;

    return (
        <div className="article-page">
            <div className="article-header">
                <Link href="/" legacyBehavior><a className="back-link">← 返回列表</a></Link>
                <h1>{article.title}</h1>
                <div className="article-meta">
                    <span>作者：{metaInfo.author}</span>
                    <span>发布时间：{metaInfo.date}</span>
                </div>
                {article.summary && (
                    <p className="article-summary">{article.summary}</p>
                )}
            </div>
            <div className="article-content" dangerouslySetInnerHTML={{ __html: article.content || '<p>暂无正文</p>' }} />
            <style jsx>{`
                .article-page {
                    max-width: 860px;
                    margin: 0 auto;
                    padding: 32px 20px 80px;
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
                    color: #1f2329;
                }
                .article-header h1 {
                    font-size: 2.4rem;
                    margin: 12px 0 8px;
                    line-height: 1.3;
                    color: #111;
                }
                .article-meta {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 16px;
                    font-size: 0.95rem;
                    color: #5c6670;
                    margin-bottom: 16px;
                }
                .article-summary {
                    background: #f7f9fc;
                    border-left: 4px solid #3a77ff;
                    padding: 12px 16px;
                    color: #3c4a5d;
                    border-radius: 4px;
                    line-height: 1.6;
                }
                .article-content {
                    margin-top: 28px;
                    font-size: 1.05rem;
                    line-height: 1.8;
                }
                .article-content :global(p) {
                    margin-bottom: 1em;
                }
                .article-content :global(img) {
                    max-width: 100%;
                    display: block;
                    margin: 18px auto;
                }
                .article-content :global(h2),
                .article-content :global(h3) {
                    margin: 1.6em 0 0.8em;
                }
                .back-link {
                    color: #3a77ff;
                    text-decoration: none;
                    font-size: 0.95rem;
                }
                .back-link:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}
