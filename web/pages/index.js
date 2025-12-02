import React from 'react';
import axios from 'axios';
import Link from 'next/link';

export async function getServerSideProps(context) {
    const page = context.query.page || 1;
    try {
        const res = await axios.get(`${process.env.API_BASE}/api/v1/articles?page=${page}`);
        return { props: { articles: res.data } };
    } catch (err) {
        return { props: { articles: [], degraded: true } };
    }
}

export default function Home({ articles, degraded }) {
    return (
        <div>
            {degraded && <div style={{ color: 'orange' }}>数据暂不可用，页面已降级</div>}
            <h1>文章列表</h1>
            <ul>
                {articles && articles.map(a => (
                    <li key={a.id}>
                        <h2><Link href={`/articles/${a.id}`}>{a.title}</Link></h2>
                        <p>{a.summary}</p>
                    </li>
                ))}
            </ul>
        </div>
    )
}
