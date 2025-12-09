// server/app.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import articlesRouter from './routes/articles.js';
import renderPage from './ssr/renderPage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// JSON 请求体解析
app.use(express.json());

// 静态资源（客户端打包输出）
app.use('/static', express.static(path.join(__dirname, '../client/dist')));

// 健康检查
app.get('/health', (req, res) => {
    res.json({ ok: true });
});

// API 路由
app.use('/api/v1/articles', articlesRouter);

// SSR 列表页
app.get('/', async (req, res) => {
    const html = await renderPage('list', { page: 1 });
    res.send(html);
});

// SSR 详情页
app.get('/articles/:id', async (req, res) => {
    const html = await renderPage('detail', { id: req.params.id });
    res.send(html);
});

// 启动服务
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`SSR Server running at http://localhost:${PORT}`);
});
