import axios from 'axios';

export async function getServerSideProps({ params }) {
    const id = params.id;
    try {
        const res = await axios.get(`${process.env.API_BASE}/api/v1/articles/${id}`);
        return { props: { article: res.data } };
    } catch (err) {
        return { props: { article: null, degraded: true } };
    }
}

export default function ArticlePage({ article, degraded }) {
    if (degraded) return <div>文章加载失败，您可以刷新重试</div>;
    if (!article) return <div>文章未找到</div>;
    return (
        <article>
            <h1>{article.title}</h1>
            <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>
    );
}
